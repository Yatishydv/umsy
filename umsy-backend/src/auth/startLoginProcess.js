import playwright from 'playwright';
import fs from 'fs';

/**
 * Start the login process - navigate to UMS and prepare for captcha
 * This matches the terminal flow exactly
 */
export async function startLoginProcess(regno, password) {
    console.log('🌐 Opening browser for login...');

    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('📄 Loading login page...');
    await page.goto('https://ums.lpu.in/lpuums/');
    await page.waitForLoadState('domcontentloaded');

    console.log('📝 Entering registration number...');
    await page.fill('input[name="txtU"]', regno);

    console.log('🖼️  Waiting for captcha...');
    await page.waitForSelector('img#ImgCaptcha', { timeout: 10000 });

    // Save captcha image
    const captchaElement = await page.$('img#ImgCaptcha');
    await captchaElement.screenshot({ path: 'captcha.png' });
    console.log('✅ Captcha saved as captcha.png');

    // Don't close browser yet - keep it open for final login
    // Store globally for the complete login step
    global.loginPage = page;
    global.loginBrowser = browser;
    global.pendingRegno = regno;
    global.pendingPassword = password;

    return { page, browser };
}
