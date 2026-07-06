import mongoose from 'mongoose';
import UserSession from './src/models/UserSession.js';

async function run() {
    try {
        const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umsy';
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const sessions = await UserSession.find();
        console.log(`Found ${sessions.length} sessions in DB.`);
        for (const s of sessions) {
            console.log(`Regno: ${s.regno}, Cookie Length: ${s.cookies?.length}`);
            console.log(`Cookies: ${s.cookies}`);
        }
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
run();
