import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';

async function run() {
    const tokenUrl = 'https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=Adl7pZVKI4dxK2SR9xAY4w==';
    console.log('Launching Playwright browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    console.log(`Loading token URL: ${tokenUrl}`);
    await page.goto(tokenUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
    });

    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`Reached page: "${title}"`);

    const playwrightCookies = await context.cookies();
    const cookieStr = playwrightCookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`Fresh cookies: ${cookieStr}`);

    await browser.close();

    console.log('\n--- Warming session via GetStudentCourses ---');
    try {
        const warmResp = await axios.post('https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses', {}, {
            headers: {
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json; charset=UTF-8',
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        console.log(`Session warming status: ${warmResp.status}`);
    } catch (e) {
        console.log(`Session warming error: ${e.message}`);
    }

    console.log('\n--- Requesting frmStatementofAccounts.aspx ---');
    try {
        const res = await axios.get('https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx', {
            headers: {
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                'Accept-Encoding': 'identity'
            },
            decompress: false,
            validateStatus: () => true
        });
        console.log(`Status: ${res.status}`);
        console.log('Headers:', res.headers);
        console.log('Body length:', res.data ? res.data.length : 0);
        fs.writeFileSync('fresh_fee_page.html', res.data);
        console.log('Saved response to fresh_fee_page.html');
    } catch (e) {
        console.log(`Request error: ${e.message}`);
    }
}

run();
