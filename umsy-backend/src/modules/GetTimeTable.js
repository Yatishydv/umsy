import * as cheerio from 'cheerio';

/**
 * Parses an HTML table element into a 2D matrix, resolving colspans and rowspans.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio instance
 * @param {import('cheerio').Element} tableEl - Table element
 * @returns {Array<Array<{text: string, $el: import('cheerio').Cheerio}>>}
 */
function parseHtmlTableTo2DArray($, tableEl) {
    const matrix = [];
    $(tableEl).find('tr').each((rIndex, tr) => {
        let cIndex = 0;
        $(tr).find('td, th').each((_, td) => {
            const $td = $(td);
            const text = $td.text().trim();
            const colspan = parseInt($td.attr('colspan') || '1', 10);
            const rowspan = parseInt($td.attr('rowspan') || '1', 10);
            
            if (!matrix[rIndex]) matrix[rIndex] = [];
            while (matrix[rIndex][cIndex] !== undefined) {
                cIndex++;
            }
            
            for (let r = 0; r < rowspan; r++) {
                const targetRow = rIndex + r;
                if (!matrix[targetRow]) matrix[targetRow] = [];
                for (let c = 0; c < colspan; c++) {
                    matrix[targetRow][cIndex + c] = {
                        text,
                        $el: $td
                    };
                }
            }
            cIndex += colspan;
        });
    });
    return matrix;
}

/**
 * Standardizes time slots from formats like "09:00 AM - 10:00 AM" to "09:00-10:00"
 * @param {string} timeStr - Raw time slot string
 * @returns {string} - Cleaned time slot
 */
function cleanTimeFormat(timeStr) {
    let clean = timeStr.replace(/\s+/g, '');
    
    const rangeMatch = clean.match(/(\d{1,2}):(\d{2})([AP]M)?-(\d{1,2}):(\d{2})([AP]M)?/i);
    if (rangeMatch) {
        let sh = parseInt(rangeMatch[1], 10);
        const sm = rangeMatch[2];
        const sampm = rangeMatch[3];
        let eh = parseInt(rangeMatch[4], 10);
        const em = rangeMatch[5];
        const eampm = rangeMatch[6];
        
        if (sampm) {
            if (sampm.toUpperCase() === 'PM' && sh < 12) sh += 12;
            if (sampm.toUpperCase() === 'AM' && sh === 12) sh = 0;
        }
        if (eampm) {
            if (eampm.toUpperCase() === 'PM' && eh < 12) eh += 12;
            if (eampm.toUpperCase() === 'AM' && eh === 12) eh = 0;
        }
        
        const startStr = `${String(sh).padStart(2, '0')}:${sm}`;
        const endStr = `${String(eh).padStart(2, '0')}:${em}`;
        return `${startStr}-${endStr}`;
    }
    
    return timeStr;
}

/**
 * Parses individual class cell text into structured object.
 * @param {string} text - Raw cell text
 * @param {string} time - Time slot
 * @returns {Object|null} - Parsed class object or null
 */
function parseClassCellText(text, time) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const courseCodeRegex = /(?:C:)?\b([A-Z]{2,6}\d{2,4}[A-Z]*[0-9-]*)\b/i;
    
    let courseCode = '';
    let type = '';
    let room = 'N/A';
    let section = 'N/A';
    let teacher = 'N/A';
    let group = 'All';

    lines.forEach(line => {
        const cMatch = line.match(courseCodeRegex);
        if (cMatch && !courseCode) {
            courseCode = cMatch[1];
        }

        const roomMatch = line.match(/Room\s*:\s*([0-9a-zA-Z-]+)/i) || line.match(/\b(\d{2,3}-\d{3,4})\b/);
        if (roomMatch && room === 'N/A') {
            room = roomMatch[1];
        }

        const groupMatch = line.match(/Group\s*:\s*([a-zA-Z0-9]+)/i) || line.match(/\bG:([a-zA-Z0-9]+)\b/i);
        if (groupMatch && group === 'All') {
            group = groupMatch[1];
        }

        const secMatch = line.match(/Sec(?:tion)?\s*:\s*([a-zA-Z0-9]+)/i) || line.match(/\bS:([a-zA-Z0-9]+)\b/i);
        if (secMatch && section === 'N/A') {
            section = secMatch[1];
        }

        const teacherMatch = line.match(/Teacher\s*:\s*(.+)/i) || line.match(/Faculty\s*:\s*(.+)/i);
        if (teacherMatch && teacher === 'N/A') {
            teacher = teacherMatch[1].replace(/^\d+::/, '').trim();
        }
        
        if (line.includes('(L)') || line.toLowerCase() === 'l' || line.toLowerCase() === 'lecture') {
            type = 'Lecture';
        } else if (line.includes('(P)') || line.toLowerCase() === 'p' || line.toLowerCase() === 'practical') {
            type = 'Practical';
        } else if (line.includes('(T)') || line.toLowerCase() === 't' || line.toLowerCase() === 'tutorial') {
            type = 'Tutorial';
        }
    });

    if (!courseCode) {
        const m = text.match(courseCodeRegex);
        if (m) {
            courseCode = m[1];
        } else {
            return null; // Skip cells that don't contain a valid course code
        }
    }

    if (!type) {
        if (text.includes('(L)') || text.toLowerCase().includes('lecture')) type = 'Lecture';
        else if (text.includes('(P)') || text.toLowerCase().includes('practical')) type = 'Practical';
        else if (text.includes('(T)') || text.toLowerCase().includes('tutorial')) type = 'Tutorial';
        else type = 'Lecture';
    }

    // Standardize combined type format expected by frontend (e.g., CSE111 (L))
    const displayType = `${courseCode}${type ? ` (${type === 'Lecture' ? 'L' : type === 'Practical' ? 'P' : 'T'})` : ''}`;

    return {
        type: displayType,
        group,
        courseCode,
        room,
        section,
        teacher,
        time
    };
}

// Helper to merge new cookies from Set-Cookie headers into the existing cookie string
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
 * Fetches student timetable from UMS
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @param {string} termId - Term ID (unused but kept for signature compatibility)
 * @returns {Promise<Object>} - Timetable data organized by day
 */
export async function fetchTimeTable(client, termId) {
    try {
        console.log('📅 Initiating fetchTimeTable request...');
        // Retrieve original cookies from client defaults
        const originalCookies = client.defaults.headers['Cookie'] || client.defaults.headers.common['Cookie'] || '';

        // Pre-flight: Warm up the session by calling the GetStudentCourses WebMethod.
        // Direct GET requests to StudentDashboard.aspx fail with 500 on token cookies,
        // but POST WebMethods execute successfully and warm the ASP.NET session context
        // so that frmStudentTimeTable.aspx loads without crashing.
        let sessionCookies = originalCookies;
        try {
            console.log('🔑 Pre-flight: Warming session via GetStudentCourses WebMethod...');
            const warmResponse = await client.post('https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses', {}, {
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            console.log(`🔑 Pre-flight session warming success: ${warmResponse.status}`);
            
            // Extract any cookies returned during the WebMethod call
            const warmSetCookies = warmResponse.headers['set-cookie'];
            if (warmSetCookies) {
                sessionCookies = mergeCookies(sessionCookies, warmSetCookies);
                console.log('🔄 Merged cookies from pre-flight warming');
            }
        } catch (warmErr) {
            console.warn('⚠️ Session warming pre-flight failed (non-fatal):', warmErr.message);
        }

        // Fetch the main Student Timetable page to retrieve the ReportViewer session data
        const response = await client.get('https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx', {
            headers: {
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                'Accept-Encoding': 'identity',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cookie': sessionCookies
            },
            decompress: false
        });

        // Merge any new session cookies returned by IIS
        const setCookieHeaders = response.headers['set-cookie'];
        let activeCookies = originalCookies;
        if (setCookieHeaders) {
            activeCookies = mergeCookies(originalCookies, setCookieHeaders);
            console.log('🔄 Merged new cookies from timetable page response');
        }

        const html = response.data;
        if (!html || typeof html !== 'string') {
            console.error('❌ Failed to load timetable page HTML (empty response)');
            throw new Error('Failed to load timetable page HTML');
        }
        console.log(`✅ Loaded timetable page HTML, length: ${html.length} chars`);

        // Check if we hit the Cloudflare challenge page
        if (html.includes('cf-challenge') || html.includes('challenges.cloudflare.com') || html.includes('cf-turnstile')) {
            throw new Error('CLOUDFLARE_BLOCKED');
        }

        // Extract the ExportUrlBase containing the active session keys
        const exportUrlMatch = html.match(/"ExportUrlBase"\s*:\s*"([^"]+)"/);
        if (!exportUrlMatch) {
            console.error('❌ Unable to find ExportUrlBase in page HTML');
            throw new Error('Unable to find ReportViewer export URL. Please verify your connection.');
        }

        const exportUrlDecoded = exportUrlMatch[1].replace(/\\u0026/g, '&').replace(/\/LpuUms\//i, '/lpuums/');
        console.log('✅ Extracted ExportUrlBase:', exportUrlDecoded);

        // Use OpType=Export with Format=HTML4.0 for synchronous server-side rendering.
        const exportUrl = 'https://ums.lpu.in' + exportUrlDecoded.replace(/&Format=$/, '&Format=HTML4.0').replace(/&Format=&/, '&Format=HTML4.0&');
        const finalExportUrl = exportUrl.includes('Format=HTML4.0') ? exportUrl : exportUrl + 'HTML4.0';

        console.log('🌐 Fetching Export HTML4.0 from:', finalExportUrl);
        const reportAreaResponse = await client.get(finalExportUrl, {
            headers: {
                'Referer': 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx',
                'Accept-Encoding': 'identity',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cookie': activeCookies
            },
            decompress: false,
            timeout: 30000
        });

        const reportAreaHtml = reportAreaResponse.data;
        if (!reportAreaHtml || typeof reportAreaHtml !== 'string') {
            console.error('❌ Failed to fetch timetable export content');
            throw new Error('Failed to fetch timetable export content');
        }
        console.log(`✅ Fetched Export HTML, length: ${reportAreaHtml.length} chars`);

        // DEBUG: Save export HTML for structure analysis
        try {
            const fs = await import('fs');
            fs.writeFileSync('debug_export.html', reportAreaHtml);
            console.log('📝 Saved debug export HTML to debug_export.html');
        } catch (e) { /* ignore */ }

        const timetable = parseTimeTableHtml(reportAreaHtml);
        return timetable;

    } catch (error) {
        console.error('❌ Error fetching timetable:', error.message);
        throw error;
    }
}

/**
 * Parses raw UMS Timetable HTML content (ReportViewer output) into a structured JSON timetable object.
 * @param {string} reportAreaHtml - Raw HTML string of the timetable report area
 * @returns {Object} - Parsed timetable by day
 */
export function parseTimeTableHtml(reportAreaHtml) {
    const $ = cheerio.load(reportAreaHtml);
    const timetable = {
        'Monday': [],
        'Tuesday': [],
        'Wednesday': [],
        'Thursday': [],
        'Friday': [],
        'Saturday': [],
        'Sunday': []
    };
    const days = Object.keys(timetable);

    $('table').each((tIdx, tableEl) => {
        const matrix = parseHtmlTableTo2DArray($, tableEl);
        if (!matrix || matrix.length === 0) return;

        // Check if Table is a simple List/Row format (e.g. Day, Time, Course...)
        let dayCol = -1, timeCol = -1, courseCol = -1;
        let roomCol = -1, typeCol = -1, teacherCol = -1;
        let sectionCol = -1, groupCol = -1;

        // Try auto-detecting headers from the first few rows
        for (let r = 0; r < Math.min(matrix.length, 3); r++) {
            const row = matrix[r];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                const txt = (row[c]?.text || '').toLowerCase().trim();
                if (txt.includes('day')) dayCol = c;
                else if (txt.includes('time') || txt.includes('slot')) timeCol = c;
                else if (txt.includes('course') || txt.includes('subject')) courseCol = c;
                else if (txt.includes('room')) roomCol = c;
                else if (txt.includes('type')) typeCol = c;
                else if (txt.includes('teacher') || txt.includes('faculty')) teacherCol = c;
                else if (txt.includes('sec')) sectionCol = c;
                else if (txt.includes('group')) groupCol = c;
            }
            if (dayCol !== -1 && timeCol !== -1 && courseCol !== -1) {
                break;
            }
        }

        // If simple list detected:
        if (dayCol !== -1 && timeCol !== -1 && courseCol !== -1) {
            console.log(`📋 Simple list layout detected in Table #${tIdx + 1}`);
            for (let r = 1; r < matrix.length; r++) {
                const row = matrix[r];
                if (!row) continue;
                const dayRaw = (row[dayCol]?.text || '').trim();
                const timeRaw = (row[timeCol]?.text || '').trim();
                const courseRaw = (row[courseCol]?.text || '').trim();

                if (!courseRaw || courseRaw.toLowerCase() === 'course' || courseRaw === '-') continue;

                const matchedDay = days.find(d => dayRaw.toLowerCase() === d.toLowerCase() || dayRaw.toLowerCase() === d.toLowerCase().substring(0, 3));
                if (matchedDay) {
                    const roomRaw = roomCol !== -1 ? row[roomCol]?.text || '' : '';
                    const typeRaw = typeCol !== -1 ? row[typeCol]?.text || '' : '';
                    const teacherRaw = teacherCol !== -1 ? row[teacherCol]?.text || '' : '';
                    const sectionRaw = sectionCol !== -1 ? row[sectionCol]?.text || '' : '';
                    const groupRaw = groupCol !== -1 ? row[groupCol]?.text || '' : '';
                    timetable[matchedDay].push({
                        type: typeRaw || courseRaw.split('/')[0] || 'Class',
                        group: groupRaw || 'All',
                        courseCode: courseRaw,
                        room: roomRaw || 'N/A',
                        section: sectionRaw || 'N/A',
                        teacher: teacherRaw || 'N/A',
                        time: cleanTimeFormat(timeRaw)
                    });
                }
            }
            return;
        }

        // Check for Grid/Matrix layout:
        let timeRowIndex = -1;
        const colIndexToTime = {};
        const rowIndexToDay = {};
        const timeRegex = /(?:\d{1,2}:\d{2})|(?:\d{1,2}-\d{1,2}\s*(?:AM|PM))/i;

        // 1. Detect if columns represent days of the week (Inverted Grid)
        let dayHeaderRowIndex = -1;
        const colIndexToDay = {};
        const rowIndexToTime = {};

        for (let r = 0; r < Math.min(matrix.length, 5); r++) {
            const row = matrix[r];
            if (!row) continue;
            let dayMatches = 0;
            for (let c = 0; c < row.length; c++) {
                const txt = (row[c]?.text || '').trim();
                const matchedDay = days.find(d => txt.toLowerCase() === d.toLowerCase() || txt.toLowerCase() === d.toLowerCase().substring(0, 3));
                if (matchedDay) {
                    colIndexToDay[c] = matchedDay;
                    dayMatches++;
                }
            }
            if (dayMatches >= 3) {
                dayHeaderRowIndex = r;
                break;
            }
        }

        if (dayHeaderRowIndex !== -1) {
            console.log(`📋 Inverted Grid layout detected in Table #${tIdx + 1}`);
            for (let r = dayHeaderRowIndex + 1; r < matrix.length; r++) {
                const row = matrix[r];
                if (!row) continue;
                for (let c = 0; c < Math.min(row.length, 3); c++) {
                    const cellText = (row[c]?.text || '').trim();
                    if (timeRegex.test(cellText)) {
                        rowIndexToTime[r] = cleanTimeFormat(cellText);
                        break;
                    }
                }
            }

            for (const rStr of Object.keys(rowIndexToTime)) {
                const r = parseInt(rStr, 10);
                const time = rowIndexToTime[r];
                const row = matrix[r];
                if (!row) continue;

                for (const cStr of Object.keys(colIndexToDay)) {
                    const c = parseInt(cStr, 10);
                    const day = colIndexToDay[c];
                    const cell = row[c];
                    if (!cell) continue;

                    const text = cell.text.trim();
                    if (!text || text === '-' || days.some(d => d.toLowerCase() === text.toLowerCase() || d.toLowerCase().substring(0, 3) === text.toLowerCase().substring(0, 3))) {
                        continue;
                    }
                    if (timeRegex.test(text)) continue;

                    const classInfo = parseClassCellText(text, time);
                    if (classInfo) {
                        const exists = timetable[day].some(cls => cls.time === classInfo.time && cls.courseCode === classInfo.courseCode);
                        if (!exists) {
                            timetable[day].push(classInfo);
                        }
                    }
                }
            }
        } else {
            // 2. Normal Grid: Rows are days, columns are times
            for (let r = 0; r < matrix.length; r++) {
                const row = matrix[r];
                if (!row) continue;
                let timeCount = 0;
                for (let c = 0; c < row.length; c++) {
                    if (row[c] && timeRegex.test(row[c].text)) {
                        timeCount++;
                    }
                }
                if (timeCount >= 2) {
                    timeRowIndex = r;
                    for (let c = 0; c < row.length; c++) {
                        if (row[c] && timeRegex.test(row[c].text)) {
                            colIndexToTime[c] = cleanTimeFormat(row[c].text);
                        }
                    }
                    break;
                }
            }

            for (let r = 0; r < matrix.length; r++) {
                if (r === timeRowIndex) continue;
                const row = matrix[r];
                if (!row) continue;
                for (let c = 0; c < Math.min(row.length, 3); c++) {
                    const cellText = (row[c]?.text || '').trim();
                    const matchedDay = days.find(d => {
                        const dl = d.toLowerCase();
                        const cl = cellText.toLowerCase();
                        return cl === dl || cl === dl.substring(0, 3);
                    });
                    if (matchedDay) {
                        rowIndexToDay[r] = matchedDay;
                        break;
                    }
                }
            }

            if (Object.keys(rowIndexToDay).length > 0 && Object.keys(colIndexToTime).length > 0) {
                for (const rStr of Object.keys(rowIndexToDay)) {
                    const r = parseInt(rStr, 10);
                    const day = rowIndexToDay[r];
                    const row = matrix[r];
                    if (!row) continue;

                    for (const cStr of Object.keys(colIndexToTime)) {
                        const c = parseInt(cStr, 10);
                        const time = colIndexToTime[c];
                        const cell = row[c];
                        if (!cell) continue;

                        const text = cell.text.trim();
                        if (!text || text === '-' || days.some(d => d.toLowerCase() === text.toLowerCase() || d.toLowerCase().substring(0, 3) === text.toLowerCase().substring(0, 3))) {
                            continue;
                        }
                        if (timeRegex.test(text)) continue;

                        const classInfo = parseClassCellText(text, time);
                        if (classInfo) {
                            const exists = timetable[day].some(cls => cls.time === classInfo.time && cls.courseCode === classInfo.courseCode);
                            if (!exists) {
                                timetable[day].push(classInfo);
                            }
                        }
                    }
                }
            }
        }
    });

    const totalClasses = Object.values(timetable).reduce((acc, curr) => acc + curr.length, 0);
    console.log(`✅ Timetable parse completed. Total classes parsed: ${totalClasses}`);
    return timetable;
}
