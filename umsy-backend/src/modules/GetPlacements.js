import * as cheerio from 'cheerio';

function mergeCookies(oldCookieString, setCookieHeaders) {
    if (!setCookieHeaders || setCookieHeaders.length === 0) return oldCookieString;
    const cookies = {};
    
    if (oldCookieString) {
        oldCookieString.split(';').forEach(c => {
            const parts = c.trim().split('=');
            if (parts.length >= 2) {
                cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
            }
        });
    }

    setCookieHeaders.forEach(header => {
        const parts = header.split(';')[0].split('=');
        if (parts.length >= 2) {
            cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });

    return Object.entries(cookies).map(([name, val]) => `${name}=${val}`).join('; ');
}

/**
 * Fetches placement data using a manual SSO redirect follower
 * because Axios auto-redirect drops Set-Cookie headers mid-chain.
 */
export async function fetchPlacements(axiosClient) {
    const originalCookies = axiosClient.defaults.headers['Cookie'] || axiosClient.defaults.headers.common['Cookie'] || '';

    console.log('🏢 Placements: Starting manual SSO redirect chain...');
    
    let currentUrl = 'https://ums.lpu.in/lpuums/frmPlacementHome.aspx';
    let sessionCookies = originalCookies;
    let homeHtml = '';
    
    // Create a special non-redirecting client for the manual hops
    const client = axiosClient.create({
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
    });

    try {
        for (let hop = 1; hop <= 5; hop++) {
            console.log(`🏢 Placements: Hop ${hop} -> ${currentUrl}`);
            const response = await client.get(currentUrl, {
                headers: {
                    'Cookie': sessionCookies,
                    'Referer': hop === 1 ? 'https://ums.lpu.in/lpuums/StudentDashboard.aspx' : currentUrl
                }
            });

            console.log(`🏢 Placements: Hop ${hop} status: ${response.status}`);

            if (response.headers['set-cookie']) {
                sessionCookies = mergeCookies(sessionCookies, response.headers['set-cookie']);
                console.log(`🍪 Placements: Hop ${hop} merged ${response.headers['set-cookie'].length} cookie(s)`);
            }

            if (response.status >= 300 && response.status < 400 && response.headers.location) {
                let nextUrl = response.headers.location;
                if (!nextUrl.startsWith('http')) {
                    const urlObj = new URL(currentUrl);
                    nextUrl = `${urlObj.origin}${nextUrl.startsWith('/') ? '' : '/'}${nextUrl}`;
                }
                console.log(`🏢 Placements: Redirecting to ${nextUrl}`);
                currentUrl = nextUrl;
            } else if (response.status === 200) {
                homeHtml = response.data;
                console.log(`🏢 Placements: Got 200 response, HTML length: ${homeHtml.length}`);
                break;
            } else {
                console.log(`⚠️ Placements: Unexpected status ${response.status} at hop ${hop}`);
                break;
            }
        }
    } catch (err) {
        console.warn('⚠️ Placements: Manual SSO chain failed:', err.message);
    }

    // Parse the home page
    let homeData = { stats: {}, activeDrives: [], scheduledRounds: [], fines: [], messages: [], recentDrives: [], placedStudents: [] };
    
    if (homeHtml && homeHtml.includes('aspnetForm') && !homeHtml.includes('loginnew')) {
        console.log('✅ Placements: Got valid home page, parsing...');
        import('fs').then(fs => fs.writeFileSync('debug_home.html', homeHtml));
        homeData = parseHomePage(homeHtml);
    } else {
        console.log('⚠️ Placements: Home page may not be the expected content');
        console.log('📄 HTML title:', homeHtml ? homeHtml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] : 'N/A');
        // Try to parse anyway — the HTML might still have useful content
        if (homeHtml) {
            homeData = parseHomePage(homeHtml);
        }
    }

    // Step 2: Try to fetch Drive Registration page using captured cookies
    let driveRegData = [];
    try {
        console.log('🏢 Placements: Attempting Drive Registration page fetch...');
        const regResponse = await axiosClient.get('https://ums.lpu.in/Placements/frmPlacementDriveRegistration.aspx', {
            headers: {
                'Referer': 'https://ums.lpu.in/Placements/HomePlacementStudent.aspx',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cookie': sessionCookies
            }
        });

        console.log(`🏢 Placements: Drive Reg response status: ${regResponse.status}`);
        const regHtml = regResponse.data;

        if (regHtml && regHtml.includes('gdvPlacement')) {
            console.log('✅ Placements: Got Drive Registration page, parsing...');
            driveRegData = parseDriveRegistrationPage(regHtml);
            console.log(`📋 Placements: Parsed ${driveRegData.length} drive registrations`);
        } else {
            console.log('⚠️ Placements: Drive Reg page may not be valid');
        }
    } catch (regErr) {
        console.warn('⚠️ Placements: Drive Registration page fetch failed:', regErr.message);
    }

    // Step 3: Try to fetch Student Placement Profile page
    let profileData = null;
    try {
        console.log('🏢 Placements: Attempting Profile page fetch...');
        const profileResponse = await client.get('https://ums.lpu.in/Placements/frmStudentPlacementAllDetails.aspx', {
            headers: {
                'Referer': 'https://ums.lpu.in/Placements/HomePlacementStudent.aspx',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cookie': sessionCookies
            }
        });

        console.log(`🏢 Placements: Profile response status: ${profileResponse.status}`);
        const profileHtml = profileResponse.data;

        if (profileHtml && profileHtml.includes('aspnetForm') && !profileHtml.includes('loginnew')) {
            console.log('✅ Placements: Got Profile page, parsing...');
            import('fs').then(fs => fs.writeFileSync('debug_profile.html', profileHtml));
            profileData = parseProfilePage(profileHtml);
        } else {
            console.log('⚠️ Placements: Profile page not available');
        }
    } catch (profErr) {
        console.warn('⚠️ Placements: Profile page fetch failed:', profErr.message);
    }

    // Step 4: Try to fetch Duty Leave page
    let dutyLeaveData = [];
    try {
        console.log('🏢 Placements: Attempting Duty Leave page fetch...');
        const dlResponse = await client.get('https://ums.lpu.in/Placements/frmGetStudentDutyLeaveRecord.aspx', {
            headers: { 'Referer': 'https://ums.lpu.in/Placements/HomePlacementStudent.aspx', 'Cookie': sessionCookies }
        });
        if (dlResponse.data && dlResponse.data.includes('aspnetForm')) {
            console.log('✅ Placements: Got Duty Leave page, parsing...');
            dutyLeaveData = parseDutyLeavePage(dlResponse.data);
        }
    } catch (err) { console.warn('⚠️ Placements: DL fetch failed:', err.message); }

    // Step 5: Try to fetch Family Details page
    let familyData = null;
    try {
        console.log('🏢 Placements: Attempting Family Details fetch...');
        const famResponse = await client.get('https://ums.lpu.in/Placements/frmFamilyDetails.aspx', {
            headers: { 'Referer': 'https://ums.lpu.in/Placements/HomePlacementStudent.aspx', 'Cookie': sessionCookies }
        });
        if (famResponse.data && famResponse.data.includes('aspnetForm')) {
            console.log('✅ Placements: Got Family page, parsing...');
            import('fs').then(fs => fs.writeFileSync('debug_family.html', famResponse.data));
            familyData = parseFamilyDetailsPage(famResponse.data);
            console.log('👪 Family Data Parsed:', familyData ? 'YES' : 'NO');
        }
    } catch (err) { console.warn('⚠️ Placements: Family fetch failed:', err.message); }

    // Step 6: Try to fetch My Rank page
    let rankData = null;
    try {
        console.log('🏢 Placements: Attempting My Rank fetch...');
        const rankResponse = await axiosClient.get('https://ums.lpu.in/Placements/DashboardStudent.aspx', {
            headers: { 'Referer': 'https://ums.lpu.in/Placements/HomePlacementStudent.aspx', 'Cookie': sessionCookies }
        });
        if (rankResponse.data && rankResponse.data.includes('aspnetForm')) {
            console.log('✅ Placements: Got My Rank page, parsing...');
            rankData = parseMyRankPage(rankResponse.data);
        }
    } catch (err) { console.warn('⚠️ Placements: Rank fetch failed:', err.message); }

    return {
        ...homeData,
        driveRegistrations: driveRegData,
        profile: profileData,
        dutyLeave: dutyLeaveData,
        familyDetails: familyData,
        myRank: rankData
    };
}

// ==================== PARSERS ====================

function parseDutyLeavePage(html) {
    const $ = cheerio.load(html);
    const records = [];
    const grid = $('#ctl00_ContentPlaceHolder1_gdvDutyLeave');
    if (grid.length > 0) {
        grid.find('tr').each((i, row) => {
            if (i === 0) return;
            const cols = $(row).find('td');
            if (cols.length >= 7) {
                records.push({
                    eventName: $(cols[0]).text().trim(),
                    eventType: $(cols[1]).text().trim(),
                    fromDate: $(cols[2]).text().trim(),
                    toDate: $(cols[3]).text().trim(),
                    status: $(cols[4]).text().trim(),
                    remarks: $(cols[5]).text().trim(),
                    requestedOn: $(cols[6]).text().trim()
                });
            }
        });
    }
    return records;
}

function parseFamilyDetailsPage(html) {
    const $ = cheerio.load(html);
    const family = { father: {}, mother: {} };
    
    // GridView inputs
    family.father.name = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl02_txtFName').val() || '';
    family.father.occupation = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl02_txtFDesignation').val() || '';
    family.father.phone = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl02_txtFContactNo').val() || '';
    
    family.mother.name = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl03_txtFName').val() || '';
    family.mother.occupation = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl03_txtFDesignation').val() || '';
    family.mother.phone = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl03_txtFContactNo').val() || '';

    // If inputs not found, try text scraping
    if (!family.father.name) {
        $('span, label').each((i, el) => {
            const t = $(el).text().trim().toLowerCase();
            const val = $(el).next().text().trim() || $(el).parent().next().text().trim();
            if (t.includes('father name')) family.father.name = val;
            if (t.includes('father occupation')) family.father.occupation = val;
            if (t.includes('mother name')) family.mother.name = val;
            if (t.includes('mother occupation')) family.mother.occupation = val;
        });
    }

    return (family.father.name || family.mother.name) ? family : null;
}

function parseMyRankPage(html) {
    const $ = cheerio.load(html);
    const rank = {};
    
    rank.overallRank = $('#ctl00_ContentPlaceHolder1_lblOverallRank').text().trim() || '';
    rank.streamRank = $('#ctl00_ContentPlaceHolder1_lblStreamRank').text().trim() || '';
    rank.pepScore = $('#ctl00_ContentPlaceHolder1_lblPepScore').text().trim() || '';
    rank.status = $('#ctl00_ContentPlaceHolder1_lblPlacementStatus').text().trim() || '';

    if (!rank.overallRank) {
        // Fallback text scraping for rank
        $('span').each((i, el) => {
            const t = $(el).text().trim().toLowerCase();
            if (t.includes('rank:')) rank.overallRank = t.replace('rank:', '').trim();
            if (t.includes('score:')) rank.pepScore = t.replace('score:', '').trim();
        });
    }

    return Object.keys(rank).length > 0 ? rank : null;
}

function parseHomePage(html) {
    const $ = cheerio.load(html);

    const stats = {};
    const statsTable = $('table').filter((i, el) => $(el).text().includes('Total Drives Held'));
    if (statsTable.length > 0) {
        const text = statsTable.text().replace(/\s+/g, ' ');
        const keys = ['Total Drives Held', 'Total Drives Eligible For', 'Registered', 'Participated', 'Selected/Offered', 'Selected(Including Independent)'];
        keys.forEach(key => {
            const regex = new RegExp(`${key}\\s*(\\d+)`, 'i');
            const match = text.match(regex);
            if (match) {
                stats[key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()] = match[1];
            }
        });
    }

    const activeDrives = [];
    const activeTable = $('#ctl00_ContentPlaceHolder1_gdvActiveDrive');
    if (activeTable.length > 0) {
        activeTable.find('tr').each((i, row) => {
            if (i === 0) return;
            const cols = $(row).find('td');
            if (cols.length >= 4) {
                activeDrives.push({
                    company: $(cols[0]).text().trim(),
                    jobProfile: $(cols[1]).text().trim(),
                    driveDate: $(cols[2]).text().trim(),
                    lastDate: $(cols[3]).text().trim()
                });
            }
        });
    }

    const scheduledRounds = [];
    const roundsTable = $('#ctl00_ContentPlaceHolder1_gvScheduleDrive');
    if (roundsTable.length > 0) {
        roundsTable.find('tr').each((i, row) => {
            if (i === 0) return;
            const cols = $(row).find('td');
            if (cols.length >= 7) {
                scheduledRounds.push({
                    batchYear: $(cols[0]).text().trim(),
                    driveCode: $(cols[1]).text().trim(),
                    companyName: $(cols[2]).text().trim(),
                    roundName: $(cols[3]).text().trim(),
                    processDate: $(cols[4]).text().trim(),
                    details: $(cols[5]).text().trim(),
                    remarks: $(cols[6]).text().trim()
                });
            }
        });
    }

    const fines = [];
    const finesTable = $('#ctl00_ContentPlaceHolder1_gdFine');
    if (finesTable.length > 0) {
        finesTable.find('tr').each((i, row) => {
            if (i === 0) return;
            const cols = $(row).find('td');
            if (cols.length >= 7) {
                fines.push({
                    companyName: $(cols[0]).text().trim(),
                    driveRound: $(cols[1]).text().trim(),
                    fineInstance: $(cols[2]).text().trim(),
                    fineAmount: $(cols[3]).text().trim(),
                    finePaid: $(cols[4]).text().trim(),
                    receiptNo: $(cols[5]).text().trim(),
                    driveDate: $(cols[6]).text().trim()
                });
            }
        });
    }

    const messages = [];
    const messagesTable = $('#ctl00_ContentPlaceHolder1_gdMessages');
    if (messagesTable.length > 0) {
        messagesTable.find('tr').each((i, row) => {
            if (i === 0) return;
            const text = $(row).find('td').text().trim();
            if (text) {
                const match = text.match(/(.*?)\s+(\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M)$/);
                if (match) {
                    messages.push({
                        date: match[2].trim(),
                        message: match[1].trim()
                    });
                } else {
                    messages.push({
                        date: '',
                        message: text
                    });
                }
            }
        });
    }

    const recentDrives = [];
    const recentTable = $('.main_tablea');
    if (recentTable.length > 0) {
        recentTable.find('tr').each((i, row) => {
            if (i === 0) return;
            const cols = $(row).find('td');
            if (cols.length >= 5) {
                recentDrives.push({
                    company: $(cols[0]).text().trim(),
                    driveCode: $(cols[1]).text().trim(),
                    driveDate: $(cols[2]).text().trim(),
                    stream: $(cols[3]).text().trim(),
                    salary: $(cols[4]).text().trim()
                });
            }
        });
    }

    const placedStudents = [];
    $('table#main_table').each((i, table) => {
        const rows = $(table).find('tr');
        if (rows.length >= 2) {
            const dataRow = $(rows[1]);
            const cols = dataRow.find('td');
            if (cols.length >= 4) {
                const img = $(rows[0]).find('img').attr('src');
                placedStudents.push({
                    name: $(cols[0]).text().trim(),
                    vid: $(cols[1]).text().trim(),
                    section: $(cols[2]).text().trim(),
                    company: $(cols[3]).text().trim(),
                    image: img ? `https://ums.lpu.in/Placements/${img}` : null
                });
            }
        }
    });

    return { stats, activeDrives, scheduledRounds, fines, messages, recentDrives, placedStudents };
}

function parseDriveRegistrationPage(html) {
    const $ = cheerio.load(html);
    const drives = [];

    const grid = $('#ctl00_ContentPlaceHolder1_gdvPlacement');
    if (grid.length === 0) {
        $('table[id*="gdvPlacement"]').find('tr').each((i, row) => {
            if (i === 0) return;
            parseDriveRow($, row, drives);
        });
        return drives;
    }

    grid.find('tr').each((i, row) => {
        if (i === 0) return;
        parseDriveRow($, row, drives);
    });

    return drives;
}

function parseDriveRow($, row, drives) {
    const cols = $(row).find('td');
    if (cols.length < 8) return;

    const driveCode = $(cols[0]).text().trim();
    const salary = $(cols[1]).text().trim();
    const registerBy = $(cols[2]).text().trim();
    const company = $(cols[3]).text().trim();
    const streams = $(cols[4]).text().trim();
    const location = $(cols[6]).text().trim();
    
    const detailsLink = $(cols[7]).find('a').attr('href') || '';
    const driveId = $(cols[8]).text().trim();
    
    const regStatus = $(cols[9]).text().trim();
    
    const eligible = $(cols[10]).text().trim();
    
    const actionBtn = $(cols[11]).find('input, a');
    const actionText = actionBtn.attr('value') || actionBtn.text().trim() || '';
    const isRegistered = actionText.includes('Cancel');

    const hallTicketLink = $(cols[12]).find('a').attr('href') || '';

    if (company) {
        drives.push({
            driveCode, salary, registerBy, company, streams, location,
            detailsLink: detailsLink ? `https://ums.lpu.in/Placements/${detailsLink}` : '',
            driveId, regStatus, eligible, actionText, isRegistered,
            hallTicketLink: hallTicketLink ? `https://ums.lpu.in/Placements/${hallTicketLink}` : ''
        });
    }
}

function parseProfilePage(html) {
    const $ = cheerio.load(html);
    const profile = { 
        personal: {}, 
        academic: {}, 
        contact: {},
        other: {}
    };

    // Try to extract student photo
    const imgEl = $('img[id*="imgPhoto"], img[id*="StudentPhoto"], img[id*="imgStudent"]');
    if (imgEl.length > 0) {
        const src = imgEl.attr('src') || '';
        if (src.startsWith('data:')) {
            profile.photo = src;
        } else if (src) {
            profile.photo = src.startsWith('http') ? src : `https://ums.lpu.in/Placements/${src}`;
        }
    }

    // Process the alternating header/value rows
    const rows = $('table tr');
    let currentHeaders = [];

    rows.each((i, row) => {
        const cells = $(row).find('td');
        
        // Is this a header row? (contains <b> tags or looks like headers)
        if ($(row).find('b').length > 0 || $(row).find('.input_form_caption_td').length > 0) {
            // Check if it actually contains headers
            let hasHeaders = false;
            const tempHeaders = [];
            
            cells.each((j, cell) => {
                const text = $(cell).text().trim().replace(/:$/, '');
                tempHeaders.push(text);
                // If it contains a <b> tag, it's definitely a header row
                if ($(cell).find('b').length > 0 && text) hasHeaders = true;
            });
            
            if (hasHeaders) {
                currentHeaders = tempHeaders;
                return; // Next row will be values
            }
        }
        
        // If we have headers and this row has values
        if (currentHeaders.length > 0 && cells.length === currentHeaders.length) {
            cells.each((j, cell) => {
                const label = currentHeaders[j];
                const value = $(cell).text().trim();
                
                if (label && value && label !== 'Select') {
                    const keyStr = label.toLowerCase();
                    // Categorize the fields intelligently
                    if (keyStr.includes('name') || keyStr.includes('gender') || keyStr.includes('dob') || keyStr.includes('birth') || keyStr.includes('nationality')) {
                        profile.personal[label] = value;
                    } else if (keyStr.includes('email') || keyStr.includes('mobile') || keyStr.includes('phone') || keyStr.includes('address') || keyStr.includes('id') || keyStr.includes('whatsapp') || keyStr.includes('skype') || keyStr.includes('linkedin')) {
                        profile.contact[label] = value;
                    } else if (keyStr.includes('cgpa') || keyStr.includes('backlog') || keyStr.includes('degree') || keyStr.includes('batch') || keyStr.includes('marks') || keyStr.includes('year') || keyStr.includes('percentage') || keyStr.includes('term')) {
                        profile.academic[label] = value;
                    } else {
                        profile.other[label] = value;
                    }
                }
            });
            currentHeaders = []; // Reset after using
        }
    });

    return Object.keys(profile).length > 0 ? profile : null;
}
