import * as cheerio from 'cheerio';

/**
 * Fetches student hostel information from the Hostel Leave Application page
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Object>} - Hostel information { vid, name, hostel, roomNo }
 */
export async function fetchHostelInfo(client) {
    // console.log('🏠 Fetching Student Hostel Information...');

    const response = await client.get(
        'https://ums.lpu.in/lpuums/frmStudentHostelLeaveApplicationTermWise.aspx',
        {
            headers: {
                // Override the default AJAX headers — this is a full browser page GET,
                // NOT an XHR. Sending X-Requested-With / application/json causes a 500.
                'Content-Type': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'X-Requested-With': undefined,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
            }
        }
    );

    const $ = cheerio.load(response.data);

    const vid    = $('#ctl00_cphHeading_lblRegNo').text().trim();
    const name   = $('#ctl00_cphHeading_lblName').text().trim();
    const hostel = $('#ctl00_cphHeading_lblHostel').text().trim();
    const roomNo = $('#ctl00_cphHeading_lblRoomNo').text().trim();

    const result = { vid, name, hostel, roomNo };

    // console.log('✅ Hostel Info:', result);
    return result;
}
