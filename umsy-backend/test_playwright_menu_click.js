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

    // Log all network events
    page.on('request', req => {
        if (req.url().includes('frmStatementofAccounts') || req.url().includes('StudentDashboard')) {
            console.log(`[Network Request] ${req.method()} -> ${req.url()}`);
        }
    });

    page.on('response', res => {
        if (res.url().includes('frmStatementofAccounts') || res.url().includes('StudentDashboard')) {
            console.log(`[Network Response] ${res.url()} -> Status: ${res.status()} (${res.statusText()})`);
        }
    });

    console.log(`Loading token URL: ${tokenUrl}`);
    await page.goto(tokenUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    console.log('\nWarming session via frmPlacementHome.aspx...');
    await page.goto('https://ums.lpu.in/lpuums/frmPlacementHome.aspx', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    console.log('\nNavigating to StudentDashboard.aspx...');
    await page.goto('https://ums.lpu.in/lpuums/StudentDashboard.aspx', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // List all anchors (a tags) on the dashboard page to find the fee status link
    const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(a => ({
            text: a.innerText.trim(),
            href: a.getAttribute('href'),
            id: a.getAttribute('id')
        }));
    });

    console.log('\nAll links on Dashboard page:');
    const feeLinks = [];
    links.forEach((l, idx) => {
        if (l.text.toLowerCase().includes('fee') || l.text.toLowerCase().includes('account') || l.text.toLowerCase().includes('statement') || (l.href && (l.href.includes('Accounts') || l.href.includes('Fee')))) {
            console.log(`⭐ MATCH [${idx}]: ID=${l.id}, Text="${l.text}", Href="${l.href}"`);
            feeLinks.push(l);
        }
    });

    if (feeLinks.length === 0) {
        console.log('No fee-related links found on dashboard menu.');
    } else {
        // Let's try to navigate to the first matching link by href
        const targetLink = feeLinks[0];
        console.log(`\nNavigating to target link href: ${targetLink.href}`);
        if (targetLink.href && targetLink.href.startsWith('javascript:')) {
            console.log('Link is JavaScript, trying to click it...');
            // Find selector
            const selector = targetLink.id ? `#${targetLink.id}` : `a:has-text("${targetLink.text}")`;
            await page.click(selector);
            await page.waitForTimeout(5000);
        } else {
            const absoluteUrl = new URL(targetLink.href, 'https://ums.lpu.in/lpuums/').href;
            console.log(`Target Absolute URL: ${absoluteUrl}`);
            await page.goto(absoluteUrl, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(5000);
        }

        const title = await page.title();
        const url = page.url();
        console.log(`\nFinal reached page: "${title}" at URL: ${url}`);
        
        const html = await page.content();
        fs.writeFileSync('playwright_menu_click_output.html', html);
        console.log(`Saved page content to playwright_menu_click_output.html (length: ${html.length})`);
    }

    await browser.close();
}

run();
