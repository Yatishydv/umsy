import * as cheerio from 'cheerio';

/**
 * Parses the Hostel Leave Slip HTML into a structured JSON object
 * @param {string} html - Raw HTML from UMS
 * @returns {object|null} - Structured data
 */
function parseLeaveSlip(html) {
    try {
        const $ = cheerio.load(html);
        const data = {};

        // Extract basic IDs
        data.leaveId = $('#ctl00_cphHeading_lblLid').text().trim();
        data.leaveCode = $('#ctl00_cphHeading_lblLCode').text().trim() || $('#ctl00_cphHeading_hfLeaveCode').val();
        data.regNo = $('#ctl00_cphHeading_lblRegNo').text().trim();
        data.studentName = $('#ctl00_cphHeading_lblName').text().trim();
        
        // Extract dates and times
        data.dateOfApply = $('#ctl00_cphHeading_lblDateofapply').text().trim();
        data.dateOfLeaving = $('#ctl00_cphHeading_lblDateofleaveing').text().trim();
        data.dateOfReturn = $('#ctl00_cphHeading_lblDateofreturn').text().trim();
        data.checkoutTime = $('#ctl00_cphHeading_lblcheckouttime').text().trim();
        data.checkinTime = $('#ctl00_cphHeading_lblcheckintime').text().trim();
        
        // Contact and Location
        data.contactNo = $('#ctl00_cphHeading_lblmobile').text().trim();
        data.hostel = $('#ctl00_cphHeading_lblhostel').text().trim();
        data.roomNo = $('#ctl00_cphHeading_lblroomno').text().trim();
        data.leaveType = $('#ctl00_cphHeading_lblLName').text().trim();

        // Extract Gate Status
        data.gateStatus = [];
        $('#ctl00_cphHeading_grdGateStatus tr').each((i, el) => {
            if (i === 0) return; // Skip header
            const gateName = $(el).find('td').eq(0).text().trim();
            const statusHtml = $(el).find('td').eq(1).html() || '';
            const isActivated = statusHtml.includes('color:green') || statusHtml.includes('Activated');
            
            if (gateName) {
                data.gateStatus.push({
                    name: gateName.replace('CheckOut(Exit) ', '').replace('CheckIn(Entry) ', ''),
                    type: gateName.includes('CheckOut') ? 'Exit' : 'Entry',
                    isActivated
                });
            }
        });

        // Extract Student Image (Direct URL)
        let imgUrl = $('#ctl00_cphHeading_Image1').attr('src') || $('img[id*="Image1"]').attr('src');
        if (imgUrl) {
            if (!imgUrl.startsWith('http')) {
                imgUrl = 'https://ums.lpu.in/lpuums/' + (imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl);
            }
            data.studentImageUrl = imgUrl;
        }

        return data;
    } catch (error) {
        console.error('Error parsing leave slip:', error);
        return null;
    }
}

/**
 * Converts an image URL to Base64 using server-side cookies
 */
async function getBase64Image(client, url) {
    try {
        const response = await client.get(url, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:${response.headers['content-type']};base64,${base64}`;
    } catch (e) {
        console.error('Base64 conversion failed:', e.message);
        return null;
    }
}

/**
 * Fetches the Hostel Leave Slip UID and parsed JSON data
 * @param {import('axios').AxiosInstance} client - Axios client with cookies
 * @returns {Promise<{uid: string, data: object}|null>} - The UID and parsed data
 */
export async function fetchLeaveSlipUid(client) {
    try {
        const response = await client.post('https://ums.lpu.in/lpuums/frmPlacementHome.aspx', {}, {
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });

        const location = response.headers.location;
        if (!location) return null;

        const url = new URL(location, 'https://ums.lpu.in');
        const uid = url.searchParams.get('Id');
        if (!uid) return null;

        const leaveSlipUrl = `https://ums.lpu.in/lpuums/frmHostelLeaveSlipTest.aspx?uid=${uid}`;
        const htmlRes = await client.get(leaveSlipUrl);
        const slipData = parseLeaveSlip(htmlRes.data);

        // Fetch image as Base64 for WebView compatibility
        if (slipData && slipData.studentImageUrl) {
            slipData.studentImageBase64 = await getBase64Image(client, slipData.studentImageUrl);
        }

        return { uid, data: slipData };
    } catch (error) {
        console.error('❌ Error fetching Leave Slip:', error.message);
        return null;
    }
}

/**
 * Fetches HTML and parses it for a direct URL
 */
export async function fetchSlipDataFromUrl(client, url) {
    try {
        const htmlRes = await client.get(url);
        const slipData = parseLeaveSlip(htmlRes.data);
        
        // Fetch image as Base64 for WebView compatibility
        if (slipData && slipData.studentImageUrl) {
            slipData.studentImageBase64 = await getBase64Image(client, slipData.studentImageUrl);
        }
        
        return slipData;
    } catch (error) {
        console.error('❌ Error fetching direct slip data:', error.message);
        return null;
    }
}
