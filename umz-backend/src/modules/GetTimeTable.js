import * as cheerio from 'cheerio';

/**
 * Fetches student timetable from UMS
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @param {string} termId - Term ID to fetch timetable for
 * @returns {Promise<Object>} - Timetable data organized by day
 */
export async function fetchTimeTable(client, termId) {
    // console.log(`📅 Fetching Student Timetable for Term: ${termId}...`);

    try {
        // Establish/initialize the session state for the timetable page
        await client.get('https://ums.lpu.in/lpuums/frmMyCurrentTimeTable.aspx', {
            headers: {
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
            }
        }).catch(err => {
            console.warn('⚠️ Timetable GET page setup failed:', err.message);
        });

        const response = await client.post(
            'https://ums.lpu.in/lpuums/frmMyCurrentTimeTable.aspx/GetTimeTable',
            { TermId: termId },
            {
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Referer': 'https://ums.lpu.in/lpuums/frmMyCurrentTimeTable.aspx',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );

        if (!response.data || !response.data.d) {
            throw new Error('Invalid response from server');
        }

        const html = response.data?.d;
        if (!html || typeof html !== 'string') {
            throw new Error('Invalid response from UMS: Expected HTML string. Your session might have expired.');
        }
        const $ = cheerio.load(html);

        const timetable = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Parse each day section
        $('section.w-schedule__day').each((_, section) => {
            const $section = $(section);
            const dayLabel = $section.find('.w-schedule__col-label').text().trim();

            if (!days.includes(dayLabel)) return;

            const classes = [];

            // Parse each event/class
            $section.find('li.w-schedule__event-wrapper').each((_, eventWrapper) => {
                const $event = $(eventWrapper).find('.w-schedule__event');
                const title = $(eventWrapper).attr('title');

                if (!title) return;

                // Parse title: " Lecture / G:All C:CSES001 / R: 36-608 / S:9P194 / Teacher: 67125::Shad Alam"
                const titleParts = title.split('/').map(part => part.trim());

                // Extract time from onclick attribute
                const onclick = $event.attr('onclick');
                let time = '';
                if (onclick) {
                    // Try to match time pattern
                    const timeMatch = onclick.match(/"(\d{2}:\d{2}-\d{2}:\d{2})"/);
                    time = timeMatch ? timeMatch[1] : '';
                }

                // Parse components
                let type = titleParts[0] || '';
                let group = '';
                let courseCode = '';
                let room = '';
                let section = '';
                let teacher = '';

                titleParts.forEach(part => {
                    if (part.startsWith('G:')) {
                        group = part.substring(2).trim();
                    } else if (part.startsWith('C:')) {
                        const cMatch = part.match(/C:(\S+)/);
                        courseCode = cMatch ? cMatch[1].trim() : '';
                    } else if (part.startsWith('R:')) {
                        room = part.substring(2).trim();
                    } else if (part.startsWith('S:')) {
                        section = part.substring(2).trim();
                    } else if (part.startsWith('Teacher:')) {
                        teacher = part.substring(8).trim();
                    }
                });

                classes.push({
                    type,
                    group,
                    courseCode,
                    room,
                    section,
                    teacher,
                    time
                });
            });

            timetable[dayLabel] = classes.length > 0 ? classes : [];
        });

        // Display the timetable
        // console.log('\n📚 TIMETABLE\n');
        // console.log('═══════════════════════════════════════════\n');

        days.forEach(day => {
            if (timetable[day]) {
                // console.log(`\n📅 ${day.toUpperCase()}`);
                // console.log('─'.repeat(43));

                if (timetable[day].length === 0) {
                    // console.log('   No classes scheduled.\n');
                } else {
                    timetable[day].forEach((cls, index) => {
                        // console.log(`\n   ${index + 1}. ${cls.time}`);
                        // console.log(`      📖 ${cls.courseCode} (${cls.type})`);
                        // console.log(`      🏫 Room: ${cls.room}`);
                        // console.log(`      👥 Section: ${cls.section}`);
                        // console.log(`      👨‍🏫 Teacher: ${cls.teacher}`);
                    });
                    // console.log('');
                }
            }
        });

        // console.log('═══════════════════════════════════════════\n');

        return timetable;

    } catch (error) {
        // console.error('❌ Error fetching timetable:', error.message);
        if (error.response) {
            // console.error('Response status:', error.response.status);
            // console.error('Response data:', error.response.data);
        }
        throw error;
    }
}
