import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umz';

let isConnected = false;

export async function connectDB() {
    if (isConnected) return;

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        console.log('✅ MongoDB connected:', MONGODB_URI.replace(/:\/\/.*@/, '://***@'));
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        // Don't crash the server — DB-dependent routes will return 503
    }

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('⚠️  MongoDB disconnected');
    });
}

export function isDBConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}
