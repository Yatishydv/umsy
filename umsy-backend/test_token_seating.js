import axios from 'axios';
import * as cheerio from 'cheerio';

async function testSeatingToken() {
    const token = 'DgIDF8l4izFmYOAomHZ3EQ==';
    console.log('Testing seating plan via token:', token);
    const client = axios.create({ headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }, decompress: false, maxRedirects: 5 });

    const step1 = await client.get('https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=' + token);
    const cookies = step1.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    console.log('Cookies received:', cookies);

    const step2 = await client.get('https://ums.lpu.in/lpuums/frmSeatingPlan.aspx', { headers: { 'Cookie': cookies } });
    console.log('frmSeatingPlan HTML length:', step2.data.length);

    const $ = cheerio.load(step2.data);
    const rows = [];
    $('table tr').each((_, tr) => {
        const cols = $(tr).find('td, th').map((_, td) => $(td).text().trim()).get();
        if (cols.length > 0) rows.push(cols);
    });
    console.log('Parsed Rows:', JSON.stringify(rows, null, 2));
}

testSeatingToken();
