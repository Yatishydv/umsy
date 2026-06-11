import * as cheerio from 'cheerio';

/**
 * Fetches password expiry warning from UMS StudentDashboard
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<string|null>} - Password expiry message or null
 */
export async function fetchPasswordExpiry(client) {
    // console.log('🔑 Fetching Password Expiry Warning...');

    try {
        const response = await client.get(
            'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
            {
                headers: {
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
                }
            }
        );

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract password expiry message from the specific span
        const passwordExpirySpan = $('#ctl00_wcUserPasswordDetail_HP_Label1');
        const passwordExpiryMessage = passwordExpirySpan.text().trim();

        if (passwordExpiryMessage) {
            // console.log(`✅ Password Expiry: ${passwordExpiryMessage}`);
            return passwordExpiryMessage;
        } else {
            // console.log('ℹ️  No password expiry message found');
            return null;
        }

    } catch (error) {
        // console.error('❌ Error fetching password expiry:', error.message);
        // Don't throw - return null so other data can still be fetched
        return null;
    }
}
