import { chromium } from 'playwright';
import axios from 'axios';

async function fetchStudentCookies(browser, token) {
    const tokenUrl = `https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=${token}==`;
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    try {
        const page = await context.newPage();
        await page.goto(tokenUrl, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(1000);
        
        const cookies = await context.cookies();
        await context.close();
        
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        return cookieString;
    } catch (e) {
        await context.close();
        throw e;
    }
}

async function testFetch() {
    const browser = await chromium.launch({ headless: true });
    // Token for Vihal Borra
    const token = 'odGx%2b4wJrb5yuZXSPbM5FQ'; 
    try {
        const cookieString = await fetchStudentCookies(browser, token);
        console.log("Cookies fetched.");
        
        const url = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentBasicInformation';
        const response = await axios.post(url, {}, {
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

testFetch();
