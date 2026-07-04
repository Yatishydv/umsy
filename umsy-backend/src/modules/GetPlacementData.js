import * as cheerio from 'cheerio';
import axios from 'axios';

/**
 * Fetches and parses student placement data
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Object>} - Parsed placement data
 */
export async function fetchPlacementData(client) {
    // console.log('📊 Fetching Placement Data...');

    try {
        const cookieString = client.defaults.headers['Cookie'] || client.defaults.headers['cookie'];
        
        const axiosOptions = {
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            },
            maxRedirects: 0, // We handle redirects manually to ensure cookies are passed correctly
            validateStatus: (status) => status >= 200 && status < 400
        };

        // Step 1: Initial request
        // console.log('   - Step 1: Requesting frmPlacementHome.aspx');
        let response = await axios.get('https://ums.lpu.in/lpuums/frmPlacementHome.aspx', axiosOptions);

        // Follow first redirect
        if (response.status === 302) {
            const nextUrl = response.headers.location.startsWith('http') 
                ? response.headers.location 
                : `https://ums.lpu.in${response.headers.location}`;
            // console.log('   - Step 2: Following redirect to:', nextUrl);
            response = await axios.get(nextUrl, axiosOptions);
        }

        // Follow second redirect
        if (response.status === 302) {
            const nextUrl = response.headers.location.startsWith('http') 
                ? response.headers.location 
                : `https://ums.lpu.in${response.headers.location}`;
            // console.log('   - Step 3: Following redirect to:', nextUrl);
            // On final hop, we can let axios follow or just use defaults
            response = await axios.get(nextUrl, { ...axiosOptions, maxRedirects: 5 });
        }

        const html = response.data;
        if (!html || typeof html !== 'string') {
            throw new Error('Invalid response - expected HTML string');
        }

        const $ = cheerio.load(html);
        
        // --- 1. Parse Profile ---
        const profile = {
            name: $('.about h1').text().trim(),
            regNo: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Prov. Reg No')).find('span').text().trim(),
            placementId: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Placement Id')).find('span').text().trim(),
            status: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Placement Services Status')).find('span').text().trim(),
            cgpa: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('CGPA')).find('span').text().trim(),
            program: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Program')).find('span').text().trim(),
            email: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Email')).find('span').text().trim(),
            contact: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Contact No')).find('span').text().trim(),
            backlogs: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('Reappear/Backlog')).find('span').text().trim(),
            pepFee: $('.personal-info li').filter((_, el) => $(el).find('label').text().includes('PEP Fee Details')).find('span').text().trim(),
        };

        // --- 2. Parse Announcements ---
        const announcements = [];
        $('#HelloBar a').each((_, el) => {
            const text = $(el).text().trim();
            if (text) announcements.push(text);
        });

        // --- 3. Parse Upcoming Drives ---
        const upcomingDrives = [];
        $('#ctl00_ContentPlaceHolder1_gdvPlacement tr.tabel_grid_white, #ctl00_ContentPlaceHolder1_gdvPlacement tr.tabel_grid_gray').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 5) {
                upcomingDrives.push({
                    driveDate: cols.eq(0).text().trim(),
                    registerBy: cols.eq(1).text().trim(),
                    company: cols.eq(2).text().trim().replace(/\s+/g, ' '),
                    status: cols.eq(4).text().trim(),
                    registered: cols.eq(5).text().trim(),
                    hallTicket: cols.eq(6).text().trim()
                });
            }
        });

        // --- 4. Parse Placement Record Summary ---
        const placementRecord = {};
        $('.new_border tr').each((_, row) => {
            const label = $(row).find('td').first().text().trim();
            const value = $(row).find('td').last().text().trim();
            if (label && value && label !== value) {
                placementRecord[label] = value;
            }
        });

        // --- 5. Parse Recent Drive Results/Announcements ---
        const recentResults = [];
        $('#ctl00_ContentPlaceHolder1_gdvAnnouncement_ctl00 tbody tr.rgRow, #ctl00_ContentPlaceHolder1_gdvAnnouncement_ctl00 tbody tr.rgAltRow').each((_, row) => {
            const title = $(row).find('strong').first().text().trim();
            const date = $(row).find('td').first().text().match(/\(\d+\/\d+\/\d+.*?\)/)?.[0] || '';
            const content = $(row).find('p').text().trim();
            
            if (title) {
                recentResults.push({
                    title,
                    date: date.replace(/[()]/g, ''),
                    content
                });
            }
        });

        return {
            profile,
            announcements,
            upcomingDrives,
            recentResults,
            placementRecord
        };

    } catch (error) {
        // console.error('❌ Error fetching placement data:', error.message);
        throw error;
    }
}
