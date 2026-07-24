import mongoose from 'mongoose';
import axios from 'axios';
import fs from 'fs';

// Define the UserSession schema
const userSessionSchema = new mongoose.Schema({
    regno: String,
    cookies: String,
    updatedAt: Date
});
const UserSession = mongoose.model('UserSession', userSessionSchema, 'usersessions');

async function run() {
    await mongoose.connect('mongodb://localhost:27017/umsy');
    console.log('MongoDB connected.');

    const session = await UserSession.findOne().sort({ updatedAt: -1 });
    if (!session) {
        console.log('No user sessions found in database!');
        await mongoose.disconnect();
        return;
    }

    console.log(`Using session for regno: ${session.regno}`);
    console.log(`Cookies: ${session.cookies}`);

    const baseHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': session.cookies,
        'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
    };

    // Test 1: Request with default Axios headers (which automatically requests gzip, deflate, br)
    try {
        console.log('\n--- Test 1: Default Axios request ---');
        const res = await axios.get('https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx', {
            headers: baseHeaders
        });
        console.log(`Status: ${res.status}, Length: ${res.data.length}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    // Test 2: Request with Accept-Encoding: identity and decompress: false (with openapp routing)
    try {
        console.log('\n--- Test 2: Accept-Encoding identity, decompress false (openapp routed) ---');
        
        console.log('Requesting openapp.aspx router...');
        const openAppRes = await axios.get('https://ums.lpu.in/lpuums/openapp.aspx?from=ums&toApp=ums&pagename=Reports/frmStatementofAccounts', {
            headers: {
                ...baseHeaders,
                'Accept-Encoding': 'identity'
            },
            decompress: false,
            maxRedirects: 5,
            validateStatus: () => true
        });
        console.log(`openapp.aspx response status: ${openAppRes.status}`);
        console.log(`openapp.aspx headers:`, openAppRes.headers);

        const res = await axios.get('https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx', {
            headers: {
                ...baseHeaders,
                'Accept-Encoding': 'identity'
            },
            decompress: false,
            validateStatus: () => true
        });
        console.log(`Status: ${res.status}`);
        console.log('Headers:', res.headers);
        console.log('Body length:', res.data ? res.data.length : 0);
        fs.writeFileSync('error_page.html', res.data);
        console.log('Saved response page to error_page.html');
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    // Test 3: Request without Accept-Encoding: identity, but decompress: false
    try {
        console.log('\n--- Test 3: Default Accept-Encoding, decompress false ---');
        const res = await axios.get('https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx', {
            headers: baseHeaders,
            decompress: false
        });
        console.log(`Status: ${res.status}, Length: ${res.data.length}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    // Test 4: Request with Accept-Encoding: identity only (no decompress: false)
    try {
        console.log('\n--- Test 4: Accept-Encoding identity, decompress true ---');
        const res = await axios.get('https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx', {
            headers: {
                ...baseHeaders,
                'Accept-Encoding': 'identity'
            }
        });
        console.log(`Status: ${res.status}, Length: ${res.data.length}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    await mongoose.disconnect();
}

run();
