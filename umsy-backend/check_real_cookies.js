import { chromium } from 'playwright';

async function run() {
    const tokenUrl = 'https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=Adl7pZVKI4dxK2SR9xAY4w==';
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    console.log(`Loading URL: ${tokenUrl}`);
    await page.goto(tokenUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
    });

    await page.waitForTimeout(2000);

    const title = await page.title();
    const url = page.url();
    console.log(`Reached page: "${title}" at URL: ${url}`);

    const cookies = await context.cookies();
    console.log('All cookies:');
    console.log(JSON.stringify(cookies, null, 2));

    await browser.close();
}

run();
