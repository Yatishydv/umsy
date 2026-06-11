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
        const heading = $div.find('.font-weight-medium').first().text().trim();

        // Parse heading format: "SUBJECT - By SENDER (DATE)"
        const match = heading.match(/(.+?)\s+-\s+By\s+(.+?)\s+\((.+?)\)/);

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
