import axios from 'axios';
import io from 'socket.io-client';
import { performHttpLogin } from './src/modules/HttpLogin.js';

const SERVER_URL = process.env.RAILWAY_URL || 'https://umsy-backend-production.up.railway.app';
console.log(`🔌 Connecting local residential relay agent to: ${SERVER_URL}...`);

const socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnect: true
});

socket.on('connect', () => {
    console.log('✅ Residential Relay Agent Connected! All deployed Vercel login requests will execute through your local machine.');
});

socket.on('perform_login', async (data) => {
    const { reqId, username, password, turnstileToken } = data;
    console.log(`⚡ Received login request from deployed website for ${username}...`);
    try {
        const result = await performHttpLogin(username, password, turnstileToken);
        socket.emit('login_result', { reqId, result });
    } catch (err) {
        socket.emit('login_result', { reqId, result: { success: false, error: err.message } });
    }
});

socket.on('disconnect', () => {
    console.log('⚠️ Relay agent disconnected. Retrying...');
});
