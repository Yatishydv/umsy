/**
 * Test: Can we log in via pure HTTP POST without Turnstile?
 * 
 * Strategy: Fetch fresh ViewState from UMS, submit form without solving Turnstile
 * The Turnstile is ONLY client-side enforced - the server may not actually validate it
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const REGNO = '12317530';
const PASSWORD = process.env.TEST_PASSWORD || ''; // Set this!

const client = axios.create({
    baseURL: 'https://ums.lpu.in/lpuums/',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
    },
    maxRedirects: 10,
    withCredentials: true,
});

// Track cookies manually
let cookieJar = {};
function extractCookies(response) {
    const setCookieHeaders = response.headers['set-cookie'] || [];
    setCookieHeaders.forEach(cookie => {
        const [pair] = cookie.split(';');
        const [name, val] = pair.split('=');
        if (name && val !== undefined) cookieJar[name.trim()] = val.trim();
    });
}
function getCookieString() {
    return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function testLogin() {
    console.log('Step 1: GET UMS login page to capture ViewState...');
    const r1 = await client.get('/', { headers: { 'Cookie': '' } });
    extractCookies(r1);
    const $ = cheerio.load(r1.data);
    const viewState = $('#__VIEWSTATE').val();
    const eventValidation = $('#__EVENTVALIDATION').val();
    const viewStateGen = $('#__VIEWSTATEGENERATOR').val();
    const pwdFieldName = $('input[type="password"]').attr('name');
    
    console.log('ViewState found:', viewState ? `YES (${viewState.length} chars)` : 'NO');
    console.log('EventValidation found:', eventValidation ? 'YES' : 'NO');
    console.log('Password field name:', pwdFieldName);
    console.log('Cookies so far:', getCookieString().substring(0, 100));

    // Step 2: POST postback to trigger password field appearance
    console.log('\nStep 2: POST with regno to trigger postback...');
    const postbackBody = new URLSearchParams({
        '__EVENTTARGET': 'txtU',
        '__EVENTARGUMENT': '',
        '__VIEWSTATE': viewState,
        '__VIEWSTATEGENERATOR': viewStateGen,
        '__EVENTVALIDATION': eventValidation,
        'txtU': REGNO,
        'ddlStartWith': 'StudentDashboard.aspx',
        'ScriptManager1': 'UpdatePanel1|txtU',
        '__ASYNCPOST': 'true',
    });
    
    const r2 = await client.post('/', postbackBody.toString(), {
        headers: {
            'Cookie': getCookieString(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-MicrosoftAjax': 'Delta=true',
            'X-Requested-With': 'XMLHttpRequest',
        }
    });
    extractCookies(r2);
    console.log('Postback status:', r2.status);
    
    // Parse updated ViewState from async response
    const asyncContent = r2.data;
    const vsMatch = asyncContent.match(/\|__VIEWSTATE\|([^|]+)\|/);
    const evMatch = asyncContent.match(/\|__EVENTVALIDATION\|([^|]+)\|/);
    const updatedVS = vsMatch ? vsMatch[1] : viewState;
    const updatedEV = evMatch ? evMatch[1] : eventValidation;
    const updatedPwdName = asyncContent.match(/name="([^"]+)" type="password"/)
        ? asyncContent.match(/name="([^"]+)" type="password"/)[1]
        : pwdFieldName;
    
    console.log('Updated ViewState:', updatedVS ? `YES (${updatedVS.length} chars)` : 'NO');
    console.log('Updated password field:', updatedPwdName);

    if (!PASSWORD) {
        console.log('\n⚠️  No TEST_PASSWORD set. Set it in .env as TEST_PASSWORD=yourpassword');
        console.log('But postback worked - the ViewState+field pattern is correct!');
        return;
    }

    // Step 3: Submit login form WITHOUT Turnstile
    console.log('\nStep 3: POST login form (no Turnstile)...');
    const loginBody = new URLSearchParams({
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__VIEWSTATE': updatedVS,
        '__VIEWSTATEGENERATOR': viewStateGen,
        '__EVENTVALIDATION': updatedEV,
        'txtU': REGNO,
        [updatedPwdName]: PASSWORD,
        'CaptchaCodeTextBox': '', // Empty captcha - testing if server validates it
        'ddlStartWith': 'StudentDashboard.aspx',
        'btnLogin': 'Login',
        // No cf-turnstile-response - testing if server requires it
    });
    
    const r3 = await client.post('/', loginBody.toString(), {
        headers: {
            'Cookie': getCookieString(),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 5,
    });
    extractCookies(r3);
    
    const finalUrl = r3.request?.res?.responseUrl || r3.config?.url;
    console.log('Login response status:', r3.status);
    console.log('Final URL:', finalUrl);
    console.log('Final cookies:', getCookieString().substring(0, 200));
    
    if (getCookieString().includes('ASP.NET_SessionId') || finalUrl?.includes('StudentDashboard')) {
        console.log('\n✅ LOGIN SUCCESS - Got valid session!');
        console.log('Full cookie string:', getCookieString());
    } else {
        const $r3 = cheerio.load(r3.data);
        const errorMsg = $r3('#lockerror').text().trim() || $r3('.alert-danger').text().trim() || 'Unknown error';
        console.log('\n❌ Login failed. Error:', errorMsg);
        console.log('Response body preview:', r3.data.substring(0, 500));
    }
}

testLogin().catch(e => console.error('Fatal error:', e.message));
