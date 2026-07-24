import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import StudentRanking from './src/models/StudentRanking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_RANKINGS_PATH = path.join(__dirname, 'current_rankings.json');
const MISSING_DATA_PATH = path.join(__dirname, 'missing_students_data.json');

async function run() {
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found.');
        process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // 1. Gather all registration numbers from our local JSON files
    let regNos = new Set();
    
    if (fs.existsSync(LOCAL_RANKINGS_PATH)) {
        const list = JSON.parse(fs.readFileSync(LOCAL_RANKINGS_PATH, 'utf8'));
        list.forEach(student => {
            if (student.RegistrationNumber) regNos.add(String(student.RegistrationNumber));
        });
    }

    if (fs.existsSync(MISSING_DATA_PATH)) {
        const missing = JSON.parse(fs.readFileSync(MISSING_DATA_PATH, 'utf8'));
        missing.forEach(student => {
            if (student.RegistrationNumber) regNos.add(String(student.RegistrationNumber));
        });
    }

    const regNosArray = Array.from(regNos);
    console.log(`Found ${regNosArray.length} unique registration numbers to update.`);

    // 2. Fetch new data for each registration number concurrently
    let updatedRecords = [];
    let failedRecords = [];
    const CONCURRENCY = 50;
    
    console.log(`Fetching from external API with concurrency ${CONCURRENCY}...`);

    for (let i = 0; i < regNosArray.length; i += CONCURRENCY) {
        const chunk = regNosArray.slice(i, i + CONCURRENCY);
        const promises = chunk.map(async (regNo) => {
            try {
                const response = await fetch(`https://ranking2-0.vercel.app/api/search?regNo=${regNo}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                if (!data.overallRank) throw new Error('No rank found');

                // Map it
                let percentage = null;
                if (data.percentile) {
                    percentage = parseFloat(data.percentile.replace('%', ''));
                }

                let totalStudents = 0;
                if (data.overallRank && percentage) {
                    totalStudents = Math.round(data.overallRank / (percentage / 100));
                }
                if (!totalStudents || isNaN(totalStudents)) {
                    totalStudents = 7500;
                }

                let batchYear = "N/A";
                if (data.regNo && data.regNo.length >= 3) {
                    const digits = data.regNo.substring(1, 3);
                    if (!isNaN(digits)) {
                        batchYear = `20${digits}`;
                    }
                }

                return {
                    RegistrationNumber: data.regNo,
                    Name: data.name,
                    Rank: data.overallRank,
                    CGPA: data.cgpa,
                    Percentage: percentage,
                    TotalStudents: totalStudents,
                    Course: data.program,
                    BatchYear: batchYear,
                    // Keep the extra fields for backward compatibility
                    regNo: data.regNo,
                    name: data.name,
                    cgpa: data.cgpa,
                    program: data.program,
                    companySelectedIn: data.companySelectedIn,
                    email: data.email,
                    contactNo: data.contactNo,
                    placementId: data.placementId,
                    basicDetails: data.basicDetails,
                    status: data.status,
                    opportunityStartDate: data.opportunityStartDate,
                    reappearBacklog: data.reappearBacklog,
                    pepFeeDetails: data.pepFeeDetails,
                    pepFeePaymentDate: data.pepFeePaymentDate,
                    xMarks: data.xMarks,
                    xiiMarks: data.xiiMarks,
                    graduationMarks: data.graduationMarks,
                    diplomaMarks: data.diplomaMarks,
                    scrapedAt: data.scrapedAt,
                    overallRank: data.overallRank,
                    percentile: data.percentile
                };
            } catch (err) {
                failedRecords.push({ regNo, error: err.message });
                return null;
            }
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null);
        updatedRecords.push(...validResults);
        
        process.stdout.write(`\rProgress: ${updatedRecords.length + failedRecords.length}/${regNosArray.length}`);
    }
    
    console.log(`\n✅ Finished fetching. Success: ${updatedRecords.length}, Failed: ${failedRecords.length}`);

    if (updatedRecords.length > 0) {
        console.log('🗑️ Clearing old records from MongoDB...');
        await StudentRanking.deleteMany({});
        
        console.log('📥 Inserting new records in bulk...');
        const BATCH_SIZE = 1000;
        for (let i = 0; i < updatedRecords.length; i += BATCH_SIZE) {
            const batch = updatedRecords.slice(i, i + BATCH_SIZE);
            await StudentRanking.insertMany(batch);
        }
        
        console.log('📝 Also saving backup to new_current_rankings.json...');
        fs.writeFileSync(path.join(__dirname, 'new_current_rankings.json'), JSON.stringify(updatedRecords, null, 2));

        console.log('🎉 Done! MongoDB and new JSON file updated.');
    }

    mongoose.connection.close();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
