import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import StudentRanking from './src/models/StudentRanking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RANKINGS_FILE = path.join(__dirname, 'current_rankings.json');

async function run() {
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in environment variables.');
        process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected successfully.');

    if (!fs.existsSync(RANKINGS_FILE)) {
        console.error(`❌ Rankings file not found at: ${RANKINGS_FILE}`);
        process.exit(1);
    }

    console.log('📖 Reading current_rankings.json...');
    const data = JSON.parse(fs.readFileSync(RANKINGS_FILE, 'utf8'));
    console.log(`✅ Loaded ${data.length} records.`);

    console.log('🗑️ Clearing existing rankings collection...');
    await StudentRanking.deleteMany({});
    console.log('✅ Collection cleared.');

    console.log('📥 Inserting records in bulk batches...');
    const BATCH_SIZE = 1000;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        await StudentRanking.insertMany(batch);
        console.log(`   - Inserted records ${i + 1} to ${Math.min(i + BATCH_SIZE, data.length)}`);
    }

    console.log('🎉 Done! All student rankings imported into MongoDB successfully.');
    await mongoose.connection.close();
}

run().catch(async (err) => {
    console.error('❌ Error:', err.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});
