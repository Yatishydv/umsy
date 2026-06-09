import * as cheerio from 'cheerio';

/**
 * Fetches term-wise CGPA data from UMS
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Array>} - Array of term data with TGPA and subjects
 */
export async function fetchTermwiseCGPA(client) {
    // console.log('📊 Fetching CGPA data...');

    const response = await client.post(
        'https://ums.lpu.in/lpuums/StudentDashboard.aspx/TermWiseCGPA',
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

    const result = [];

    // Parse each term block
    $('h4').each((_, el) => {
        const text = $(el).text().trim();

        if (!text.startsWith('Term :')) return;

        const term = text.replace('Term :', '').trim();

        // TGPA is in the sibling column
        const tgpa = $(el)
            .closest('.row')
            .find('h4')
            .last()
            .text()
            .replace('TGPA :', '')
            .trim();

        // Get the parent row and find the next table-responsive div
        const tableDiv = $(el).closest('.row').nextAll('div.table-responsive').first();
        const table = tableDiv.find('table').first();

        const subjects = [];

        table.find('tbody tr').each((_, row) => {
            const cols = $(row).find('td');

            const course = $(cols[0]).text().trim();
            const grade = $(cols[1]).text().replace('Grade :', '').trim();

            subjects.push({ course, grade });
        });

        result.push({ term, tgpa, subjects });
    });

    // Display the data
    // console.log('\n📊 TERM-WISE CGPA REPORT\n');
    // console.log('═══════════════════════════════════════════\n');

    result.forEach((t, index) => {
        // console.log(`━━━ TERM ${t.term} ━━━  TGPA: ${t.tgpa}\n`);

        t.subjects.forEach((s, i) => {
            const [code, ...nameParts] = s.course.split('::');
            const courseName = nameParts.join('::').trim();
            // console.log(`  ${(i + 1).toString().padStart(2)}. ${code.trim().padEnd(10)} ${courseName.padEnd(50)} [${s.grade}]`);
        });

        // if (index < result.length - 1) {
        //     console.log('\n');
        // }
    });

    // console.log('\n═══════════════════════════════════════════\n');

    return result;
}
