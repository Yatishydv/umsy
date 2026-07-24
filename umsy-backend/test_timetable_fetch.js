import { chromium } from 'playwright';
import { createAxiosClient } from './src/utils/createAxiosClient.js';
import { fetchStudentCourses } from './src/modules/GetStudentCourses.js';
import { fetchTimeTable } from './src/modules/GetTimeTable.js';
import fs from 'fs';

async function run() {
    try {

        const student = {
            name: "Yatish Kumar",
            regno: "12301342",
            token: "Adl7pZVKI4dxK2SR9xAY4w"
        };
        console.log(`Found student: ${student.name} (${student.regno})`);

        const tokenUrl = `https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=${student.token}==`;
        console.log(`Launching browser to load: ${tokenUrl}`);
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        await page.goto(tokenUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        console.log(`Page title: ${await page.title()}`);
        console.log(`Page URL: ${page.url()}`);
        const landingContent = await page.content();
        fs.writeFileSync('playwright_landing.html', landingContent);
        console.log(`Saved playwright_landing.html (${landingContent.length} chars)`);

        console.log('Navigating to StudentDashboard.aspx in browser to warm session...');
        const dashRes = await page.goto('https://ums.lpu.in/lpuums/StudentDashboard.aspx', { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);
        console.log(`Dashboard page status: ${dashRes ? dashRes.status() : 'No response'}`);
        console.log(`Dashboard page title: ${await page.title()}`);
        console.log(`Dashboard page URL: ${page.url()}`);
        const dashContent = await page.content();
        console.log(`Dashboard page content length: ${dashContent.length}`);
        fs.writeFileSync('playwright_dashboard.html', dashContent);
        console.log('Saved playwright_dashboard.html');

        console.log('Navigating to frmStudentTimeTable.aspx in browser...');
        let ttRes;
        try {
            ttRes = await page.goto('https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000);
        } catch (err) {
            console.log('⚠️ Navigation timed out or failed, checking content anyway:', err.message);
        }
        console.log(`Timetable page status: ${ttRes ? ttRes.status() : 'No response'}`);
        console.log(`Timetable page title: ${await page.title()}`);
        console.log(`Timetable page URL: ${page.url()}`);
        const content = await page.content();
        console.log(`Timetable page content length: ${content.length}`);
        fs.writeFileSync('playwright_timetable.html', content);
        console.log('Saved playwright_timetable.html');

        const cookies = await context.cookies();
        console.log('All retrieved cookies:', JSON.stringify(cookies, null, 2));
        await browser.close();

        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`Obtained cookies: ${cookieString}`);

        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const client = createAxiosClient(cookieString, ua);

        console.log('Fetching courses...');
        const courses = await fetchStudentCourses(client);
        console.log(`Courses fetched: ${courses.length}`);
        
        console.log('Testing student result fetch...');
        try {
            const { fetchStudentResult } = await import('./src/modules/GetStudentResult.js');
            const resultData = await fetchStudentResult(client);
            console.log('Result fetch success. CGPA:', resultData.cgpa);
        } catch (resErr) {
            console.error('Result fetch failed:', resErr.message);
        }

        let termId = String(courses[0].term || '');
        if (termId.endsWith('1')) {
            termId = termId.slice(0, -1) + 'A';
        } else if (termId.endsWith('2')) {
            termId = termId.slice(0, -1) + 'W';
        }
        console.log(`Term ID: ${termId}`);

        console.log('Fetching timetable using updated fetchTimeTable...');
        const timetable = await fetchTimeTable(client, termId);
        console.log('Timetable fetched successfully:', JSON.stringify(timetable, null, 2));

    } catch (e) {
        console.error('Error occurred:', e);
    }
}

run();
