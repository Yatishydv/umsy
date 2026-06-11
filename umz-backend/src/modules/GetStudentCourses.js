import * as cheerio from 'cheerio';

/**
 * Fetches student courses from UMS Dashboard
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Array>} - Array of course data with details
 */
export async function fetchStudentCourses(client) {
    // console.log('📊 Fetching Student Courses...');

    try {
        const response = await client.post(
            'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses',
            {},
            {
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );

        // Check if response has the expected structure
        if (!response.data) {
            throw new Error('Invalid response from server - no data');
        }

        // The response should have a 'd' property containing the HTML
        const html = response.data.d;

        if (!html || typeof html !== 'string') {
            // console.error('Response data:', response.data);
            throw new Error('Invalid response format - expected HTML string in data.d');
        }

        const $ = cheerio.load(html);
        const courses = [];

        // Parse each course div
        $('.mycoursesdiv').each((_, courseDiv) => {
            const $div = $(courseDiv);

            // Extract attendance percentage from the circular progress indicator
            const attendanceText = $div.find('.c100 span').text().trim();
            const attendance = attendanceText.replace('%', '');

            // Extract course details from the paragraphs
            const $paragraphs = $div.find('.col-sm-6 p');

            // First paragraph contains course code and name
            const firstP = $paragraphs.eq(0);
            const courseCode = firstP.find('b').first().text().trim();

            // Get the full text and extract course name and term
            const firstPHtml = firstP.html() || '';

            // Extract course name (between course code and <br>)
            const courseNameMatch = firstPHtml.match(/:\s*([^<]+)<br/i);
            const courseName = courseNameMatch ? courseNameMatch[1].trim() : '';

            // Extract term
            const termMatch = firstPHtml.match(/<b>Term\s*:\s*<\/b>(\d+\w*)/i);
            const term = termMatch ? termMatch[1].trim() : '';

            // Find the paragraph that contains "Roll No"
            let rollNo = '';
            let group = '';
            $paragraphs.each((_, p) => {
                const pText = $(p).text();
                if (pText.includes('Roll No')) {
                    const rollNoMatch = pText.match(/Roll No\s*:\s*(.+?)\s*\/\s*(.+)/);
                    if (rollNoMatch) {
                        rollNo = rollNoMatch[1].trim();
                        group = rollNoMatch[2].trim();
                    }
                }
            });

            // Find the paragraph that contains "Exam Pattern"
            let examPattern = 'NA';
            $paragraphs.each((_, p) => {
                const pText = $(p).text();
                if (pText.includes('Exam Pattern')) {
                    const examPatternMatch = pText.match(/Exam Pattern\s*:\s*(.+)/);
                    if (examPatternMatch) {
                        examPattern = examPatternMatch[1].trim();
                    }
                }
            });

            courses.push({
                courseCode,
                courseName,
                term,
                rollNo,
                group,
                examPattern,
                attendance
            });
        });

        // console.log('\n📚 STUDENT COURSES\n');

        // courses.forEach((course, index) => {
        //     console.log(`${index + 1}. ${course.courseCode} - ${course.courseName}`);
        //     console.log(`   Term: ${course.term} | Attendance: ${course.attendance}%`);
        //     console.log(`   Roll No: ${course.rollNo} | Group: ${course.group}`);
        //     console.log(`   Exam Pattern: ${course.examPattern}`);
        //     console.log('');
        // });

        return courses;

    } catch (error) {
        // console.error('❌ Error fetching courses:', error.message);
        if (error.response) {
            // console.error('Response status:', error.response.status);
            // console.error('Response data:', error.response.data);
        }
        throw error;
    }
}
