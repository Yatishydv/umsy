import * as cheerio from 'cheerio';

export async function fetchStudentSeatingPlan(client) {
    // console.log('📊 Fetching Student Seating Plan...');

    const response = await client.post(
        'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetSeatingPlan',
        {},
        {
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
            }
        }
    );

    // console.log('📦 Raw response:', JSON.stringify(response.data).substring(0, 200));

    const html = response.data?.d;
    if (!html || typeof html !== 'string') {
        return [];
    }

    const $ = cheerio.load(html);
    const seatingPlan = [];

    // console.log('🔍 Found .mycoursesdiv elements:', $('.mycoursesdiv').length);

    $('.mycoursesdiv').each((_, el) => {
        const container = $(el);

        // Header text
        const headerText = container
            .find('.font-weight-medium')
            .clone()
            .children()
            .remove()
            .end()
            .text()
            .trim();

        // Date + course
        const headerMatch = headerText.match(
            /Date\s*:\s*(.+?)\s+([A-Z]+\d+)\s*:\s*(.+)/
        );

        const date = headerMatch?.[1] || '';
        const courseCode = headerMatch?.[2] || '';
        const courseName = headerMatch?.[3] || '';

        // Status badge
        const status = container.find('.badge').text().trim();

        // Exam info
        const examText = container.find('p').eq(0).text().trim();
        const roomText = container.find('p').eq(1).text().trim();

        // Room & reporting
        const roomMatch = roomText.match(/Room No\s*:\s*(.+?)\s+Reporting\s*:\s*(.+)/);

        seatingPlan.push({
            date,
            courseCode,
            courseName,
            status,
            exam: examText.replace('Exam :', '').trim(),
            room: roomMatch?.[1] || '',
            reportingTime: roomMatch?.[2] || ''
        });
    });

    // Pretty output
    // console.log('\n🪑 SEATING PLAN\n');
    // console.log(`📊 Total items found: ${seatingPlan.length}`);

    // seatingPlan.forEach((e, i) => {
    //     // console.log(`${i + 1}. ${e.courseCode} - ${e.courseName}`);
    //     // console.log(`   📅 Date: ${e.date}`);
    //     // console.log(`   🧪 Exam: ${e.exam}`);
    //     // console.log(`   🏫 Room: ${e.room}`);
    //     // console.log(`   ⏱ Reporting: ${e.reportingTime}`);
    //     // console.log(`   📌 Status: ${e.status}\n`);
    // });

    // console.log('✅ Returning seating plan data:', JSON.stringify(seatingPlan, null, 2));
    return seatingPlan;
}