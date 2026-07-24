import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
    regno: String,
    cookies: String,
    updatedAt: Date
});
const UserSession = mongoose.model('UserSession', userSessionSchema, 'usersessions');

async function run() {
    await mongoose.connect('mongodb://localhost:27017/umsy');
    console.log('MongoDB connected.');

    const sessions = await UserSession.find().sort({ updatedAt: -1 }).limit(10);
    console.log(`Found ${sessions.length} sessions:`);
    for (const s of sessions) {
        console.log(`Regno: ${s.regno}, Updated: ${s.updatedAt}`);
        console.log(`Cookies: ${s.cookies}`);
        console.log('-------------------------------------------');
    }

    await mongoose.disconnect();
}

run();
