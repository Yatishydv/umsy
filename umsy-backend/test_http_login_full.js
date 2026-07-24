import mongoose from 'mongoose';
import { httpLogin } from './src/modules/HttpLogin.js';
import 'dotenv/config';

const REGNO = '12317530';

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/umsy');
    const user = await mongoose.connection.db.collection('usertokens').findOne({ regno: REGNO });
    const password = user?.dob;
    console.log('Password from DB:', password ? `YES (${password.length} chars)` : 'NOT FOUND');
    
    if (!password) {
        console.log('No password stored - user needs to login once via /login');
        await mongoose.disconnect();
        return;
    }
    
    try {
        const cookieString = await httpLogin(REGNO, password);
        console.log('\n✅ HTTP LOGIN SUCCESS!');
        console.log('Cookie string length:', cookieString.length);
        console.log('Has ASP.NET_SessionId:', cookieString.includes('ASP.NET_SessionId'));
        console.log('Has _ga_B0Z6G6GCD8:', cookieString.includes('_ga_B0Z6G6GCD8'));
        console.log('First 300 chars:', cookieString.substring(0, 300));
        
        // Now test GetSeatingPlan WebMethod with these cookies
        console.log('\n🪑 Testing GetSeatingPlan WebMethod...');
        const axios = (await import('axios')).default;
        const resp = await axios.post(
            'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetSeatingPlan',
            {},
            {
                headers: {
                    'Cookie': cookieString,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
                },
                timeout: 15000
            }
        );
        console.log('GetSeatingPlan response status:', resp.status);
        console.log('Response d length:', resp.data?.d?.length || 0);
        if (resp.data?.d) console.log('Response preview:', resp.data.d.substring(0, 500));
        else console.log('Full response:', JSON.stringify(resp.data).substring(0, 300));
        
    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) {
            console.log('Response status:', e.response.status);
            console.log('Response body preview:', e.response.data?.toString()?.substring(0, 1000));
        }
    }
    
    await mongoose.disconnect();
}

test();
