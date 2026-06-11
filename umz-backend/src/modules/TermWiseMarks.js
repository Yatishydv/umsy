import * as cheerio from 'cheerio';

/**
 * Fetches term-wise marks data from UMS
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Array>} - Array of term data with subjects and marks breakdown
 */
export async function fetchTermWiseMarks(client) {
    // console.log('📊 Fetching Term Wise Marks data...');

    const response = await client.post(
        'https://ums.lpu.in/lpuums/StudentDashboard.aspx/TermWiseMarks',
        {},
        {
            headers: {
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
            }
        }
    );

    const html = response.data?.d;
    if (!html || typeof html !== 'string') {
        throw new Error('Invalid response from UMS: Expected HTML string. Your session might have expired.');
    }
    const $ = cheerio.load(html);

    const terms = [];

    // Parse each term (each div.border)
    $('div.border').each((_, termDiv) => {
        const $termDiv = $(termDiv);

        // Extract term ID from the heading
        const termHeading = $termDiv.find('p.main-heading').first().text();
        const termIdMatch = termHeading.match(/Term Id\s*:\s*(\S+)/);
        const termId = termIdMatch ? termIdMatch[1].trim() : '';

        if (!termId) return; // Skip if no term ID found

        // Find all subjects in this term
        const subjects = [];

        $termDiv.find('div.divdetail').each((_, subjectDiv) => {
            const $subjectDiv = $(subjectDiv);

            // Extract course code and name from h4
            const courseHeading = $subjectDiv.find('h4.text-center').first().text().trim();
            const courseMatch = courseHeading.match(/^([A-Z0-9]+)\s*:\s*(.+)$/);

            const courseCode = courseMatch ? courseMatch[1].trim() : '';
            const courseName = courseMatch ? courseMatch[2].trim() : courseHeading;

            // Extract marks breakdown from table
            const marksBreakdown = [];
            $subjectDiv.find('table tbody tr').each((_, row) => {
                const $row = $(row);
                const cols = $row.find('td');

                const type = $(cols[0]).text().trim();
                const marks = $(cols[1]).text().trim();
                const weightage = $(cols[2]).text().trim();

                marksBreakdown.push({
                    type,
                    marks,
                    weightage
                });
            });

            subjects.push({
                courseCode,
                courseName,
                marksBreakdown
            });
        });

        terms.push({
            termId,
            subjects
        });
    });

    // Display the data
    // console.log('\n📊 TERM-WISE MARKS BREAKDOWN\n');
    // console.log('═══════════════════════════════════════════\n');

    terms.forEach((term, termIndex) => {
        // console.log(`\n━━━ TERM: ${term.termId} ━━━\n`);

        term.subjects.forEach((subject, subjectIndex) => {
            // console.log(`${subjectIndex + 1}. ${subject.courseCode} - ${subject.courseName}`);
            // console.log('   ┌─────────────────────────────────────────┐');

            subject.marksBreakdown.forEach((mark, i) => {
                const isLast = i === subject.marksBreakdown.length - 1;
                const border = isLast ? '   └' : '   │';
                // console.log(`${border} ${mark.type.padEnd(30)} │ ${mark.marks.padEnd(10)} │ ${mark.weightage}`);
            });

            // if (subjectIndex < term.subjects.length - 1) {
            //     // console.log('   └─────────────────────────────────────────┘\n');
            // } else {
            //     // console.log('   └─────────────────────────────────────────┘');
            // }
        });

        // if (termIndex < terms.length - 1) {
        //     // console.log('\n');
        // }
    });

    // console.log('\n═══════════════════════════════════════════\n');

    return terms;
}
