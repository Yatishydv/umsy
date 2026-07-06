import { createAxiosClient } from './src/utils/createAxiosClient.js';
import { fetchStudentCourses } from './src/modules/GetStudentCourses.js';
import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
    try {
        const student = {
            name: "Yatish Kumar",
            regno: "12301342",
            token: "Adl7pZVKI4dxK2SR9xAY4w"
        };

        const tokenUrl = `https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=${student.token}==`;
        console.log(`Launching browser to load: ${tokenUrl}`);
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        await page.goto(tokenUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        const cookies = await context.cookies();
        await browser.close();

        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const client = createAxiosClient(cookieString);

        // Fetch courses to check authentication
        const courses = await fetchStudentCourses(client);
        console.log(`Successfully authenticated. Courses fetched: ${courses.length}`);

        // List of possible WebMethods to test
        const methods = [
            'GetTimeTable',
            'GetStudentTimeTable',
            'StudentTimeTable',
            'GetStudentTimeTableDetails',
            'GetStudentSchedule',
            'GetClassSchedule',
            'GetTodayTimeTable',
            'GetTodaySchedule',
            'GetWeeklySchedule',
            'GetStudentTimeTableData',
            'GetSchedule'
        ];

        console.log('\nTesting WebMethods on StudentDashboard.aspx...');
        for (const method of methods) {
            try {
                const url = `https://ums.lpu.in/lpuums/StudentDashboard.aspx/${method}`;
                const response = await client.post(url, {}, {
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                        'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                console.log(`✅ Method ${method}: SUCCESS (Status: ${response.status})`);
                console.log(`   Response:`, JSON.stringify(response.data).substring(0, 300));
            } catch (err) {
                const status = err.response ? err.response.status : 'network error';
                console.log(`❌ Method ${method}: FAILED (Status: ${status})`);
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
