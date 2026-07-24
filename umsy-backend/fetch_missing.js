import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import UserToken from './src/models/UserToken.js';

import { fetchPlacementData } from './src/modules/GetPlacementData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, 'results.json');
const RANKINGS_FILE = path.join(__dirname, 'current_rankings.json');
const MISSING_FILE = path.join(__dirname, 'missing_students_data.json');

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
    const d = response.data?.d || [];
    const details = d[0];
    if (!details) throw new Error('Empty response from WebMethod');
    return details;
}

async function run() {
    console.log('Starting missing students fetcher...');
    
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in environment variables.');
        process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected successfully.');

    console.log('📖 Fetching users with tokens from database...');
    const allStudentsWithTokens = await UserToken.find({ token: { $exists: true, $ne: '' } });
    console.log(`✅ Found ${allStudentsWithTokens.length} students with tokens.`);
    
    let rankingsMap = new Map();
    if (fs.existsSync(RANKINGS_FILE)) {
        const existing = JSON.parse(fs.readFileSync(RANKINGS_FILE, 'utf8'));
        existing.forEach(item => {
            rankingsMap.set(item.RegistrationNumber, item);
        });
    }

    // Find missing
    let missingStudents = [];
    for (const student of allStudentsWithTokens) {
        const record = rankingsMap.get(student.regno);
        if (!record || record.Section === 'N/A' || !record.Section) {
            missingStudents.push(student);
        }
    }

    console.log(`Found ${missingStudents.length} students missing Section/RollNumber.`);
    if (missingStudents.length === 0) {
        console.log('No missing students to fetch.');
        return;
    }

    const browser = await chromium.launch({ headless: true });
    
    let processed = 0;
    let succeeded = 0;
    let fetchedData = [];
    
    for (let i = 0; i < missingStudents.length; i += CONCURRENCY_LIMIT) {
        const batch = missingStudents.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`\nProcessing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1} (${i + 1} to ${Math.min(i + CONCURRENCY_LIMIT, missingStudents.length)})...`);
        
        await Promise.all(batch.map(async (student) => {
            try {
                const cookieString = await fetchStudentCookies(browser, student.token);
                if (!cookieString) throw new Error('No cookies returned');
                
                const details = await fetchStudentDetails(cookieString);
                
                let oldRecord = rankingsMap.get(student.regno) || {};

                let companySelectedIn = 'Not Selected';
                let placementId = '—';
                let pepFeeDetails = '—';
                try {
                    const client = axios.create({
                        headers: {
                            'Cookie': cookieString,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    const placementData = await fetchPlacementData(client);
                    if (placementData?.profile) {
                        placementId = placementData.profile.placementId || '—';
                        pepFeeDetails = placementData.profile.pepFee || '—';
                    }
                    if (placementData?.placementRecord) {
                        const keys = Object.keys(placementData.placementRecord);
                        const companyKey = keys.find(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('selected'));
                        if (companyKey) {
                            companySelectedIn = placementData.placementRecord[companyKey];
                        } else if (placementData.profile?.status) {
                            companySelectedIn = placementData.profile.status;
                        }
                    }
                } catch (e) {
                    companySelectedIn = oldRecord?.companySelectedIn || 'Not Selected';
                    placementId = oldRecord?.placementId || '—';
                    pepFeeDetails = oldRecord?.pepFeeDetails || '—';
                }
                
                const record = {
                    Name: details.StudentName || oldRecord?.Name || oldRecord?.name || student.name,
                    RegistrationNumber: student.regno,
                    Course: details.Program || oldRecord?.Course || oldRecord?.program || 'N/A',
                    Section: details.Section || oldRecord?.Section || 'N/A',
                    RollNumber: details.RollNumber || oldRecord?.RollNumber || 'N/A',
                    CGPA: details.CGPA || oldRecord?.CGPA || oldRecord?.cgpa || '0.00',
                    reappearBacklog: details.ActiveBacklogs || oldRecord?.reappearBacklog || '0',
                    status: details.StudentStatus || oldRecord?.status || 'Active',
                    BatchYear: student.regno.substring(0, 3) || oldRecord?.BatchYear || '—',
                    scrapedAt: new Date().toISOString(),
                    companySelectedIn: companySelectedIn,
                    placementId: placementId,
                    opportunityStartDate: oldRecord?.opportunityStartDate || '—',
                    pepFeeDetails: pepFeeDetails,
                    pepFeePaymentDate: oldRecord?.pepFeePaymentDate || '—',
                    xMarks: oldRecord?.xMarks || 'N/A',
                    xiiMarks: oldRecord?.xiiMarks || 'N/A',
                    graduationMarks: oldRecord?.graduationMarks || 'N/A',
                    diplomaMarks: oldRecord?.diplomaMarks || 'N/A',
                    email: oldRecord?.email || '',
                    contactNo: oldRecord?.contactNo || '',
                    basicDetails: oldRecord?.basicDetails || ''
                };
                
                fetchedData.push(record);
                succeeded++;
                console.log(`✅ Fetched: ${record.RegistrationNumber} - ${record.Name}`);
            } catch (err) {
                console.log(`❌ Failed: ${student.regno} (${student.name}) - Error: ${err.message}`);
            }
            
            processed++;
        }));
        
        fs.writeFileSync(MISSING_FILE, JSON.stringify(fetchedData, null, 2), 'utf8');
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
    
    await browser.close();
    await mongoose.disconnect();
    console.log('\nFinished missing students fetch!');
    console.log(`Total missing processed: ${processed}, Succeeded: ${succeeded}`);
}

run().catch(err => {
    console.error('Fatal Error:', err);
});
