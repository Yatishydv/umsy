import { parseTimeTableHtml } from './src/modules/GetTimeTable.js';
import fs from 'fs';

async function test() {
    try {
        console.log('Reading debug_export.html...');
        const html = fs.readFileSync('debug_export.html', 'utf8');
        
        console.log('Parsing timetable HTML...');
        const timetable = parseTimeTableHtml(html);
        
        console.log('\nParsed Timetable slots by day:');
        for (const day of Object.keys(timetable)) {
            console.log(`\n📅 ${day}:`);
            const classes = timetable[day];
            classes.forEach(c => {
                console.log(`   - [${c.time}] ${c.courseCode} (Room: ${c.room})`);
            });
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
