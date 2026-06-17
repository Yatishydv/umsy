import * as cheerio from 'cheerio';

/**
 * Fetches student messages from UMS
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<Array>} - Array of messages
 */
export async function fetchStudentMessages(client) {
    // console.log('📊 Fetching Student Messages...');

    const response = await client.post(
        'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentMessages',
        {},
        {
            headers: {
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
            }
        }
    );

    const html = response.data?.d;
    if (!html || typeof html !== 'string') {
        return [];
    }
    const $ = cheerio.load(html);

    const messages = [];

    // Parse each message div
    $('div.mycoursesdiv').each((_, msgDiv) => {
        const $div = $(msgDiv);

        // Extract subject, sender, and date from the heading
        const headingEl = $div.find('.font-weight-medium').first();
        
        // Replace <br> tags AND literal newlines with ' | ' separator before extracting text
        // The UMS HTML contains literal newlines in headings like:
        // "Session of Morgan Stanley.  Date: 08 May 2026\nTime: 10:00 AM to 11:00 AM - By Saurav Singh (May 07, 2026)"
        // Without normalization, the regex `.+` won't match across newlines
        const headingHtml = headingEl.html() || '';
        const cleanedHtml = headingHtml.replace(/<br\s*\/?>/gi, ' | ').replace(/[\r\n]+/g, ' | ');
        const heading = cheerio.load(cleanedHtml).text().trim().replace(/\s+/g, ' ');
        
        // console.log('🔍 RAW HEADING HTML:', JSON.stringify(headingHtml));
        // console.log('🔍 CLEANED HEADING:', heading);

        // Parse heading format: "SUBJECT - By SENDER (DATE)"
        // Use GREEDY (.+) for subject so it captures everything up to the LAST " - By"
        const match = heading.match(/(.+)\s+-\s+By\s+(.+?)\s+\((.+?)\)/);

        // console.log('🔍 REGEX MATCH:', match ? { subject: match[1], sender: match[2], date: match[3] } : 'NO MATCH');

        const subject = match ? match[1].trim() : heading;
        const sender = match ? match[2].trim() : '';
        const date = match ? match[3].trim() : '';

        // Extract message content
        const content = $div.find('p.text-small').text().trim();

        messages.push({
            subject,
            sender,
            date,
            content
        });
    });

    // Display the data
    // console.log('\n STUDENT MESSAGES\n');
    // console.log('═══════════════════════════════════════════\n');

    if (messages.length === 0) {
        // console.log('No messages found.\n');
    } else {
        messages.forEach((msg, index) => {
            // console.log(`━━━ MESSAGE ${index + 1} ━━━`);
            // console.log(`📌 ${msg.subject}`);
            // console.log(`👤 From: ${msg.sender}`);
            // console.log(`📅 Date: ${msg.date}\n`);

            // Display message content with wrapping
            const contentLines = msg.content.match(/.{1,80}(\s|$)/g) || [msg.content];
            contentLines.forEach(line => {
                // console.log(`   ${line.trim()}`);
            });

            if (index < messages.length - 1) {
                // console.log('\n');
            }
        });
    }

    // console.log('\n═══════════════════════════════════════════\n');
    // console.log(`Total Messages: ${messages.length}\n`);

    return messages;
}
