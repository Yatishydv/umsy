import { chromium } from 'playwright';
import axios from 'axios';

const paths = [
    '/lpuums/Reports/frmStatementofAccounts.aspx',
    '/lpuums/Reports/frmFeeStatus.aspx',
    '/lpuums/Reports/frmStudentFeeStatus.aspx',
    '/lpuums/Reports/frmFeeStatement.aspx',
    '/lpuums/Reports/frmAccountStatement.aspx',
    '/lpuums/Reports/frmStudentTimeTable.aspx'
];

async function run() {
    const tokenUrl = 'https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=Adl7pZVKI4dxK2SR9xAY4w==';
    console.log('Logging in via Playwright...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(tokenUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const playwrightCookies = await context.cookies();
    const cookieStr = playwrightCookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`Cookies: ${cookieStr}`);
    await browser.close();

    console.log('\nWarming session via GetStudentCourses...');
    await axios.post('https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses', {}, {
        headers: {
            'Cookie': cookieStr,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json; charset=UTF-8',
            'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    console.log('GET requesting StudentDashboard.aspx to initialize session variables...');
    const dashGet = await axios.get('https://ums.lpu.in/lpuums/StudentDashboard.aspx', {
        headers: {
            'Cookie': cookieStr,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://ums.lpu.in/',
            'Accept-Encoding': 'identity'
        },
        decompress: false,
        validateStatus: () => true
    });
    console.log(`StudentDashboard.aspx GET status: ${dashGet.status}`);

    console.log('\nProbing paths...');
    for (const p of paths) {
        const url = `https://ums.lpu.in${p}`;
        try {
            const res = await axios.get(url, {
                headers: {
                    'Cookie': cookieStr,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                    'Accept-Encoding': 'identity'
                },
                decompress: false,
                maxRedirects: 0,
                validateStatus: () => true
            });
            console.log(`Path: ${p} -> Status: ${res.status}, Length: ${res.data ? res.data.length : 0}`);
        } catch (e) {
            console.log(`Path: ${p} -> Error: ${e.message}`);
        }
    }
}

run();
