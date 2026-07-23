import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Perform direct HTTP-based ASP.NET login to UMS using client-solved Turnstile token.
 * No Puppeteer required — completes in < 1.5 seconds and bypasses Cloudflare datacenter blocks.
 */
export async function performHttpLogin(username, password, turnstileToken) {
    const cleanUsername = username?.trim();
    const cleanPassword = password?.trim();
    const token = turnstileToken?.trim() || '';

    console.log(`[v05login] Starting HTTP login for: ${cleanUsername}...`);

    // 1. Initial GET to obtain ASP.NET ViewState, EventValidation, and scrambled input names
    const initResponse = await axios.get('https://ums.lpu.in/lpuums/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000
    });

    const initCookies = initResponse.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
    const $ = cheerio.load(initResponse.data);

    const viewState = $('#__VIEWSTATE').val() || '';
    const eventValidation = $('#__EVENTVALIDATION').val() || '';
    const viewStateGen = $('#__VIEWSTATEGENERATOR').val() || '';

    // Locate the scrambled password field name (type="password")
    const passInput = $('input[type="password"]');
    const passFieldName = passInput.attr('name') || passInput.attr('id') || 'fYxDkgVaOVWX';

    // Locate the submit button name (type="submit")
    const submitBtn = $('input[type="submit"][value="Login"]') || $('input[type="submit"]');
    const submitBtnName = submitBtn.attr('name') || 'fYxDkgVaOVWX4FlEu1';

    console.log(`[v05login] Scrambled fields — Pass: ${passFieldName}, Submit: ${submitBtnName}`);

    // 2. Build form payload
    const params = new URLSearchParams();
    params.append('__LASTFOCUS', '');
    params.append('__EVENTTARGET', '');
    params.append('__EVENTARGUMENT', '');
    params.append('__VIEWSTATE', viewState);
    if (viewStateGen) params.append('__VIEWSTATEGENERATOR', viewStateGen);
    params.append('__EVENTVALIDATION', eventValidation);
    params.append('txtU', cleanUsername);
    params.append(passFieldName, cleanPassword);
    params.append('cf-turnstile-response', token);
    params.append(submitBtnName, 'Login');

    // 3. POST form payload directly to UMS
    let authCookies = initCookies;
    let redirectUrl = null;

    try {
        const loginResponse = await axios.post('https://ums.lpu.in/lpuums/', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': initCookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://ums.lpu.in/lpuums/',
                'Origin': 'https://ums.lpu.in'
            },
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400,
            timeout: 12000
        });

        const newSetCookies = loginResponse.headers['set-cookie'];
        if (newSetCookies && newSetCookies.length > 0) {
            authCookies = newSetCookies.map(c => c.split(';')[0]).join('; ');
        }

        if (loginResponse.status >= 300 && loginResponse.status < 400) {
            redirectUrl = loginResponse.headers.location;
        }
    } catch (postErr) {
        if (postErr.response) {
            const newSetCookies = postErr.response.headers['set-cookie'];
            if (newSetCookies && newSetCookies.length > 0) {
                authCookies = newSetCookies.map(c => c.split(';')[0]).join('; ');
            }
            if (postErr.response.headers.location) {
                redirectUrl = postErr.response.headers.location;
            }
        } else {
            throw postErr;
        }
    }

    console.log(`[v05login] Result cookies length: ${authCookies.length}, redirect: ${redirectUrl || 'none'}`);

    return {
        success: authCookies.includes('ASP.NET_SessionId') || authCookies.includes('UMS_ID') || (redirectUrl && redirectUrl.includes('StudentDashboard')),
        cookies: authCookies,
        redirectUrl
    };
}
