import * as cheerio from 'cheerio';

/**
 * Fetches student contact number from UMS
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Object>} - Object with phone number and count/type
 */
export async function fetchStudentContactNo(client) {
    // console.log('📊 Fetching Student Contact No...');

    const response = await client.post(
        'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentContactNo',
        {},
        {
            headers: {
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
            }
        }
    );

    const rawData = response.data.d;

    // Parse the response format "7739864558:1"
    const parts = rawData.split(':');
    const phoneNumber = parts[0]?.trim() || '';

    // console.log('\n📞 STUDENT CONTACT INFORMATION\n');
    // console.log(`Phone Number: ${phoneNumber}`);
    // console.log('');

    return {
        phoneNumber,
    };
}
