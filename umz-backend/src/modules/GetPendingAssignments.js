import * as cheerio from 'cheerio';

/**
 * Fetch pending assignments for the student from UMS
 * @param {import('axios').AxiosInstance} client - Axios client with cookies
 * @returns {Promise<Array>} - Array of pending assignment objects
 */
export async function fetchPendingAssignments(client) {
    try {
        // console.log('   - Requesting Pending Assignments...');
        const response = await client.post('https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudenPendingAssignments', {});
        
        if (!response.data || !response.data.d) {
            // console.log('   - No assignments found or empty response');
            return [];
        }

        const html = response.data?.d;
        if (!html || typeof html !== 'string') {
            return [];
        }
        const $ = cheerio.load(html);
        const assignments = [];

        $('.mycoursesdiv').each((index, element) => {
            const courseCode = $(element).find('.col-sm-3.font-weight-small').first().text().trim();
            const fullText = $(element).find('.font-weight-medium').text().trim();
            
            // Expected format: "Course : CSE332 | CA-2 (MCQ-Based Test) | Last Date :07-05-2026"
            const parts = fullText.split('|').map(p => p.trim());
            
            let description = parts[1] || '';
            let lastDate = '';
            
            if (parts[2] && parts[2].includes('Last Date :')) {
                lastDate = parts[2].replace('Last Date :', '').trim();
            }

            const uploadLink = $(element).find('a.uploadbtn').attr('href') || '';

            assignments.push({
                courseCode,
                description,
                lastDate,
                uploadLink: uploadLink.startsWith('http') ? uploadLink : `https://ums.lpu.in/lpuums/${uploadLink}`
            });
        });

        // console.log(`   - Found ${assignments.length} pending assignments`);
        return assignments;
    } catch (error) {
        console.error('❌ Error in fetchPendingAssignments:', error.message);
        throw error;
    }
}
