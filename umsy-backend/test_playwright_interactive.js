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
    await page.waitForTimeout(3000);

    console.log('Navigating to StudentDashboard.aspx...');
    await page.goto('https://ums.lpu.in/lpuums/StudentDashboard.aspx', {
        waitUntil: 'networkidle',
        timeout: 60000
    });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`Dashboard title: "${title}"`);

    const html = await page.content();
    fs.writeFileSync('dashboard.html', html);
    console.log(`Saved dashboard HTML (length: ${html.length})`);

    // Let's search for frmStatementofAccounts or Statement or Accounts
    console.log('\n--- Searching for links and keywords ---');
    const keywords = ['frmStatementofAccounts', 'statement', 'account', 'fee'];
    for (const kw of keywords) {
        const count = (html.match(new RegExp(kw, 'gi')) || []).length;
        console.log(`Keyword "${kw}": found ${count} times.`);
    }

    // List all anchors (a tags) and their hrefs that match keywords
    const hrefs = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(a => ({
            text: a.innerText.trim(),
            href: a.getAttribute('href')
        })).filter(item => {
            const t = item.text.toLowerCase();
            const h = (item.href || '').toLowerCase();
            return t.includes('fee') || t.includes('statement') || t.includes('account') ||
                   h.includes('fee') || h.includes('statement') || h.includes('account') || h.includes('accounts');
        });
    });

    console.log('\nMatching Menu Links:');
    console.log(JSON.stringify(hrefs, null, 2));

    await browser.close();
}

run();
