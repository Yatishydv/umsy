import * as cheerio from 'cheerio';

export async function fetchStudentAttendanceDetail(client) {
    // console.log('📊 Fetching Student Attendance Detail...');

    try {
        const response = await client.post(
            'https://ums.lpu.in/lpuums/StudentDashboard.aspx/StudentAttendanceDetail',
            {},
            {
                headers: {
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );

        const html = response.data?.d;

        if (!html || typeof html !== 'string') {
            // console.error('❌ No HTML data received from attendance API');
            return [];
        }

        const $ = cheerio.load(html);
        const courses = [];

        // Track seen course codes so we keep only the FIRST block per course.
        // UMS returns one block per lecture slot/batch, so the same courseCode
        // can appear many times — merging them inflates totals into the thousands.
        const seenCodes = new Set();

        $('div.border').each((_, courseDiv) => {
            try {
                const $div = $(courseDiv);

                const courseHeading = $div.find('p.main-heading').first().text().trim();
                // console.log(`📝 Processing course heading: "${courseHeading}"`);

                // More flexible regex to match course code
                const codeMatch = courseHeading.match(/Course\s*code\s*:\s*([A-Z0-9]+)/i);
                const courseCode = codeMatch ? codeMatch[1].trim() : (courseHeading || 'UNKNOWN');

                // Skip if we've already added this course
                if (seenCodes.has(courseCode)) {
                    // console.log(`⚠️  Skipping duplicate block for: ${courseCode}`);
                    return;
                }

                const attendanceRecords = [];

                $div.find('table tbody tr').each((_, row) => {
                    try {
                        const cols = $(row).find('td');

                        if (cols.length >= 5) {
                            attendanceRecords.push({
                                date: $(cols[0]).text().trim(),
                                time: $(cols[1]).text().trim(),
                                type: $(cols[2]).text().trim(),
                                status: $(cols[3]).text().trim(),
                                faculty: $(cols[4]).text().trim(),
                                remark: cols.length > 5 ? $(cols[5]).text().trim() : ''
                            });
                        }
                    } catch (rowError) {
                        // console.error('❌ Error processing attendance row:', rowError.message);
                    }
                });

                if (courseCode && attendanceRecords.length > 0) {
                    const courseData = {
                        courseCode,
                        totalRecords: attendanceRecords.length,
                        presentCount: attendanceRecords.filter(r => r.status === 'P').length,
                        absentCount: attendanceRecords.filter(r => r.status === 'A').length,
                        records: attendanceRecords
                    };
                    courses.push(courseData);
                    seenCodes.add(courseCode);
                    // console.log(`✅ Added course: ${courseCode} (${courseData.presentCount}/${courseData.totalRecords})`);
                }
            } catch (courseError) {
                // console.error('❌ Error processing course div:', courseError.message);
            }
        });

        // Pretty output
        if (courses.length > 0) {
            // console.log('\n📊 DETAILED ATTENDANCE RECORDS');
            // console.log('══════════════════════════════════════════════════\n');

            courses.forEach(course => {
                // console.log(`━━━ ${course.courseCode} ━━━`);
                // console.log(`Total: ${course.totalRecords} | Present: ${course.presentCount} | Absent: ${course.absentCount}\n`);

                course.records.forEach((r, i) => {
                    const dot = r.status === 'P' ? '🟢' : '🔴';
                    // console.log(
                    //     ` ${String(i + 1).padStart(2)}. ${r.date.padEnd(12)} ${r.time.padEnd(18)} [${r.type}] ${dot} ${r.status} - ${r.faculty}`
                    // );
                });

                // console.log('\n');
            });

            // console.log('══════════════════════════════════════════════════\n');
        } else {
            // console.log('⚠️  No attendance records found');
        }

        return courses;
    } catch (error) {
        // console.error('❌ Error in fetchStudentAttendanceDetail:', error.message);
        // console.error('Stack:', error.stack);
        throw new Error(`Failed to fetch attendance details: ${error.message}`);
    }
}