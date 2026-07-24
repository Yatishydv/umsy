import { chromium } from 'playwright';
import fs from 'fs';

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
    await page.waitForTimeout(2000);

    console.log('Navigating directly to Reports/frmStatementofAccounts.aspx...');
    await page.goto('https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx', {
        waitUntil: 'networkidle',
        timeout: 60000
    });
    await page.waitForTimeout(3000);

    const title = await page.title();
    const url = page.url();
    console.log(`Reached page: "${title}" at URL: ${url}`);

    const html = await page.content();
    fs.writeFileSync('playwright_fee_page.html', html);
    console.log(`Saved page content to playwright_fee_page.html (length: ${html.length})`);

    // Let's check if the table exists
    const tableCount = await page.locator('table').count();
    console.log(`Found ${tableCount} tables on the page.`);

    await browser.close();
}

run();
