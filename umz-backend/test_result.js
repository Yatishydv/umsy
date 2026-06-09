import axios from 'axios';
import fs from 'fs';
import * as cheerio from 'cheerio';
import { fetchStudentResult } from './src/modules/GetStudentResult.js';

const cookies = '_ga_B0Z6G6GCD8=dpsvjehkkiegqmz4gstr2elx';

const client = axios.create({
    decompress: false,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies,
        'Accept-Encoding': 'identity'
    }
});

async function run() {
    try {
        console.log('Fetching results page...');
        const response = await client.get('https://ums.lpu.in/lpuums/frmStudentResult.aspx');
        console.log('Response status:', response.status);
        console.log('Response length:', response.data.length);
        fs.writeFileSync('result_page.html', response.data);
        console.log('Saved response to result_page.html');
        
        const $ = cheerio.load(response.data);
        const title = $('title').text().trim();
        console.log('Page Title:', title);
        
        const parsed = await fetchStudentResult(client);
        console.log('Parsed result data:', JSON.stringify(parsed, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

run();
