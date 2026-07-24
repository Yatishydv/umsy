import { chromium } from 'playwright';

async function run() {
    const tokenUrl = 'https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=Adl7pZVKI4dxK2SR9xAY4w==';
    console.log('Launching browser...');
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

    for (let i = 1; i <= 6; i++) {
        await page.waitForTimeout(2000);
        const cookies = await context.cookies();
        console.log(`Cookies after ${i * 2}s (count: ${cookies.length}):`);
        console.log(cookies.map(c => `${c.name}=${c.value}`).join('; '));
        console.log('----------------------------------------------------');
    }

    await browser.close();
}

run();
