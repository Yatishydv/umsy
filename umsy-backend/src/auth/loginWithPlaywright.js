import { chromium } from 'playwright';
import { BASE_URL, CAPTCHA_IMAGE } from '../config/constants.js';
import { getUserInput } from '../utils/getUserInput.js';

/**
 * Performs login using Playwright to handle ASP.NET WebForms complexity
 * @param {string} regno - Student registration number
 * @param {string} password - Student password
 * @param {string} captchaText - Optional captcha text (for web server flow)
 * @returns {Promise<string>} - Cookie string for authenticated session
 */
export async function loginWithPlaywright(regno, password, captchaText = null) {
    let browser, page, isExistingSession = false;

    // Check if we have an existing Playwright session (web server flow)
    if (global.loginPage && global.pendingRegno === regno) {
        console.log('📱 Using existing Playwright session...');
        page = global.loginPage;
        browser = global.loginBrowser;
        isExistingSession = true;
    } else {
        // Fresh login (CLI flow)
        console.log('🌐 Opening browser for login...');
        browser = await chromium.launch({ headless: false });

        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });

            page = await context.newPage();

            // Navigate to login page
            console.log('📄 Loading login page...');
            await page.goto(BASE_URL, { waitUntil: 'networkidle' });

            // Fill registration number
            console.log('📝 Entering registration number...');
            const regnoField = page.locator('input[name="txtU"]');
            await regnoField.click();
            await page.waitForTimeout(300);
            await regnoField.type(regno, { delay: 100 });
            await page.waitForTimeout(500);
            await regnoField.blur();

            // Wait for captcha to load
            console.log('🖼️  Waiting for captcha...');
            await page.waitForSelector('#c_loginnew_examplecaptcha_CaptchaImage', { timeout: 5000 });

            // Screenshot captcha
            const captchaElement = await page.$('#c_loginnew_examplecaptcha_CaptchaImage');
            await captchaElement.screenshot({ path: CAPTCHA_IMAGE });
            console.log(`✅ Captcha saved as ${CAPTCHA_IMAGE}`);

            // Get captcha from user (CLI only)
            if (!captchaText) {
                console.log(`\n📋 Please check ${CAPTCHA_IMAGE} for the captcha\n`);
                captchaText = await getUserInput('Enter Captcha: ');
            }
        } catch (error) {
            await browser.close();
            throw error;
        }
    }

    try {
        // Fill captcha
        console.log('🔐 Filling credentials...');
        const captchaField = page.locator('input[name="CaptchaCodeTextBox"]');
        await captchaField.click();
        await page.waitForTimeout(200);
        await captchaField.type(captchaText, { delay: 120 });
        await page.waitForTimeout(400);

        // Fill password
        const pwdField = page.locator('input[type="password"]');
        await pwdField.click();
        await page.waitForTimeout(200);
        await pwdField.type(password, { delay: 100 });
        await page.waitForTimeout(600);

        // Select Dashboard option in dropdown
        console.log('📋 Selecting Dashboard option...');
        const dropdown = page.locator('select[name="ddlStartWith"]');
        await dropdown.selectOption({ value: 'StudentDashboard.aspx' });
        await page.waitForTimeout(300);

        // Click login button
        console.log('🔘 Clicking login...');
        const loginButton = page.locator('input[type="submit"][value="Login"]');
        await loginButton.click();
        await page.waitForTimeout(300);

        // Wait for navigation result
        try {
            await page.waitForURL('**/StudentDashboard.aspx', { timeout: 10000 });
            console.log('✅ Login successful!');
        } catch (error) {
            const currentUrl = page.url();
            if (currentUrl.includes('lpuums/') && !currentUrl.includes('StudentDashboard')) {
                throw new Error('Login failed - Invalid credentials or captcha');
            }
            throw error;
        }

        // Extract cookies
        console.log('🍪 Extracting cookies...');
        const context = page.context();
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log('✅ Cookies extracted, closing browser...');
        await browser.close();

        // Clear global state
        if (isExistingSession) {
            delete global.loginPage;
            delete global.loginBrowser;
            delete global.pendingRegno;
            delete global.pendingPassword;
        }

        return cookieString;

    } catch (error) {
        console.error('❌ Error during login:', error.message);
        await browser.close();

        // Clear global state on error
        if (isExistingSession) {
            delete global.loginPage;
            delete global.loginBrowser;
            delete global.pendingRegno;
            delete global.pendingPassword;
        }

        throw error;
    }
}
