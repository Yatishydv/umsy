import axios from 'axios';
import * as cheerio from 'cheerio';

async function testHttpPost() {
    console.log('Fetching LoginNew.aspx...');
    const initRes = await axios.get('https://ums.lpu.in/lpuums/LoginNew.aspx', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    const $ = cheerio.load(initRes.data);

    const viewState = $('#__VIEWSTATE').val();
    const eventValidation = $('#__EVENTVALIDATION').val();
    const passInput = $('input[type="password"]');
    const passName = passInput.attr('name');
    const submitBtn = $('input[type="submit"]');
    const submitName = submitBtn.attr('name');

    console.log('Cookies:', cookies);
    console.log('ViewState len:', viewState?.length);
    console.log('EventValidation len:', eventValidation?.length);
    console.log('Pass field:', passName);
    console.log('Submit field:', submitName);
}

testHttpPost();
