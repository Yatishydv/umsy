import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import UserToken from './src/models/UserToken.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resultsPath = path.resolve(__dirname, './results.json');

async function migrateTokens() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Reading results.json...');
        const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
        
        console.log(`Found ${resultsData.length} records in results.json. Processing...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // We'll use bulkWrite for efficiency
        const operations = [];
        
        // To handle duplicates in the JSON itself (where there might be multiple entries for same regno),
        // we'll keep the last seen or the one with a token.
        const bestRecords = new Map();
        for (const record of resultsData) {
            if (record.regno && record.dob && record.token) {
                bestRecords.set(record.regno, record);
            }
        }

        for (const [regno, record] of bestRecords.entries()) {
            operations.push({
                updateOne: {
                    filter: { regno: record.regno },
                    update: { $set: { 
                        name: record.name,
                        dob: record.dob,
                        token: record.token
                    } },
                    upsert: true
                }
            });
            
            // Execute in batches of 1000 to prevent memory issues
            if (operations.length === 1000) {
                const result = await UserToken.bulkWrite(operations);
                successCount += result.upsertedCount + result.modifiedCount + result.matchedCount;
                operations.length = 0;
            }
        }
        
        if (operations.length > 0) {
            const result = await UserToken.bulkWrite(operations);
            successCount += result.upsertedCount + result.modifiedCount + result.matchedCount;
        }

        console.log(`Migration Complete: Processed ${successCount} unique user tokens successfully. Errors: ${errorCount}`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

migrateTokens();
