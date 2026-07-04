import { loginWithPlaywright } from './auth/loginWithPlaywright.js';
import { createAxiosClient } from './utils/createAxiosClient.js';
import { getUserInput } from './utils/getUserInput.js';
import { fetchTermwiseCGPA } from './modules/TermwiseCGPA.js';
import { fetchStudentContactNo } from './modules/GetStudentContactNo.js';
import { fetchStudentBasicInformation } from './modules/GetStudentBasicInformation.js';
import { fetchStudentCourses } from './modules/GetStudentCourses.js';
import { fetchTermWiseMarks } from './modules/TermWiseMarks.js';
import { fetchStudentAttendanceSummary } from './modules/StudentAttendanceSummary.js';
import { fetchStudentAttendanceDetail } from './modules/StudentAttendanceDetail.js';
import { fetchStudentMessages } from './modules/GetStudentMessages.js';
import { fetchTimeTable } from './modules/GetTimeTable.js';

/**
 * Display menu options
 */
function displayMenu() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║          UMS DATA FETCHER MENU         ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('  1. Fetch Courses');
    console.log('  2. Fetch Basic Information');
    console.log('  3. Fetch Contact Number');
    console.log('  4. Fetch CGPA (Term-wise)');
    console.log('  5. Fetch Term-wise Marks');
    console.log('  6. Fetch Attendance Summary');
    console.log('  7. Fetch Attendance Detail');
    console.log('  8. Fetch Student Messages');
    console.log('  9. Fetch Timetable');
    console.log('  *. Exit');
    console.log('═══════════════════════════════════════════\n');
}

/**
 * Main entry point for UMS scraper
 */
async function main() {
    try {
        console.log('🎯 UMS Login - Hybrid Playwright + Axios\n');

        // Get credentials
        const regno = await getUserInput('Enter Registration Number: ');
        const password = await getUserInput('Enter Password: ');

        // Login with Playwright (handles WebForms complexity)
        const cookies = await loginWithPlaywright(regno, password);

        // Create lightweight Axios client for all further requests
        const client = createAxiosClient(cookies);

        console.log('\n✅ Login successful! Session is ready.');
        console.log('💡 Browser closed - all future requests are lightweight HTTP\n');

        // Interactive menu loop
        let running = true;
        while (running) {
            displayMenu();
            const choice = await getUserInput('Enter your choice: ');

            switch (choice.trim()) {
                case '1':
                    await fetchStudentCourses(client);
                    break;

                case '2':
                    await fetchStudentBasicInformation(client);
                    break;

                case '3':
                    await fetchStudentContactNo(client);
                    break;

                case '4':
                    await fetchTermwiseCGPA(client);
                    break;

                case '5':
                    await fetchTermWiseMarks(client);
                    break;

                case '6':
                    await fetchStudentAttendanceSummary(client);
                    break;

                case '7':
                    try {
                        await fetchStudentAttendanceDetail(client);
                    } catch (error) {
                        console.log('\n⚠️  Attendance Detail not available.');
                        console.log('   This feature may not be enabled for your account.');
                        console.log('   Error:', error.message);
                    }
                    break;

                case '8':
                    await fetchStudentMessages(client);
                    break;

                case '9':
                    try {
                        const coursesData = await fetchStudentCourses(client);
                        if (coursesData && coursesData.length > 0) {
                            const termId = coursesData[0].term;
                            await fetchTimeTable(client, termId);
                        } else {
                            console.log('❌ No courses found - cannot fetch timetable');
                        }
                    } catch (error) {
                        console.log('❌ Error:', error.message);
                    }
                    break;

                case '*':
                    console.log('\n👋 Exiting... Goodbye!');
                    running = false;
                    break;

                default:
                    console.log('\n❌ Invalid choice! Please select 1-9 or * to exit.');
                    break;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the scraper
main();

// Export modules for external use
export { loginWithPlaywright, createAxiosClient, fetchTermwiseCGPA, fetchTimeTable };
