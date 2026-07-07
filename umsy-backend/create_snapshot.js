import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File Paths
const RESULTS_FILE = path.join(__dirname, 'results.json');
const RANKINGS_FILE = path.join(__dirname, 'current_rankings.json');

// Concurrency settings
const CONCURRENCY_LIMIT = 3;
const DELAY_BETWEEN_BATCHES = 1000;

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

async function fetchStudentDetails(cookieString) {
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
    
    // Parse the JSON result
    const rawData = response.data?.d;
    if (!rawData) throw new Error('Empty response from WebMethod');
    return JSON.parse(rawData);
}

async function run() {
    console.log('🏆 UMSY Ranking Snapshot Generator starting...');
    
    if (!fs.existsSync(RESULTS_FILE)) {
        console.error(`❌ Input file results.json not found at: ${RESULTS_FILE}`);
        process.exit(1);
    }
    
    const students = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    const studentsWithTokens = students.filter(s => s.token && s.token.trim().length > 0);
    console.log(`✅ Loaded ${students.length} total students. Found ${studentsWithTokens.length} students with tokens.`);
    
    // Load existing progress if any
    let rankingsMap = new Map();
    if (fs.existsSync(RANKINGS_FILE)) {
        try {
            const existing = JSON.parse(fs.readFileSync(RANKINGS_FILE, 'utf8'));
            existing.forEach(item => {
                rankingsMap.set(item.RegistrationNumber, item);
            });
            console.log(`📋 Loaded ${rankingsMap.size} pre-existing entries from current_rankings.json`);
        } catch (e) {
            console.log('⚠️ Could not parse existing rankings file. Starting fresh.');
        }
    }
    
    const browser = await chromium.launch({ headless: true });
    
    let processed = 0;
    let succeeded = 0;
    
    // We process students in batches
    for (let i = 0; i < studentsWithTokens.length; i += CONCURRENCY_LIMIT) {
        const batch = studentsWithTokens.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`\n🔄 Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1} (${i + 1} to ${Math.min(i + CONCURRENCY_LIMIT, studentsWithTokens.length)})...`);
        
        await Promise.all(batch.map(async (student) => {
            // Skip if already processed and has CGPA
            if (rankingsMap.has(student.regno) && rankingsMap.get(student.regno).CGPA) {
                console.log(`⏭️ Skipping ${student.regno} (${student.name}) - already in database.`);
                processed++;
                return;
            }
            
            try {
                const cookieString = await fetchStudentCookies(browser, student.token);
                if (!cookieString) {
                    throw new Error('No cookies returned');
                }
                
                const details = await fetchStudentDetails(cookieString);
                
                const record = {
                    Name: details.StudentName || student.name,
                    RegistrationNumber: student.regno,
                    Course: details.Program || 'N/A',
                    CGPA: details.CGPA || '0.00',
                    reappearBacklog: details.ActiveBacklogs || '0',
                    status: 'Active',
                    BatchYear: student.regno.substring(0, 3) || '—',
                    scrapedAt: new Date().toISOString()
                };
                
                rankingsMap.set(student.regno, record);
                succeeded++;
                console.log(`✅ Fetched: ${record.RegistrationNumber} - ${record.Name} (CGPA: ${record.CGPA})`);
            } catch (err) {
                console.log(`❌ Failed: ${student.regno} (${student.name}) - Error: ${err.message}`);
            }
            
            processed++;
        }));
        
        // Write progress incrementally to disk
        if (succeeded > 0) {
            // Sort and recalculate rankings
            const list = Array.from(rankingsMap.values());
            list.sort((a, b) => parseFloat(b.CGPA || '0') - parseFloat(a.CGPA || '0'));
            
            // Assign ranks
            list.forEach((item, idx) => {
                item.Rank = idx + 1;
                item.TotalStudents = list.length;
                const percentileVal = ((idx + 1) / list.length) * 100;
                item.percentile = `Top ${percentileVal.toFixed(2)}%`;
            });
            
            fs.writeFileSync(RANKINGS_FILE, JSON.stringify(list, null, 2), 'utf8');
            console.log(`💾 Saved progress: ${list.length} students ranked.`);
        }
        
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
    
    await browser.close();
    console.log('\n🎉 Finished snapshot generation!');
    console.log(`Total processed: ${processed}, Succeeded: ${succeeded}`);
}

run().catch(err => {
    console.error('Fatal Error:', err);
});
