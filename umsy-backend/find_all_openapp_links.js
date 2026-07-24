import fs from 'fs';

function find() {
    const lines = fs.readFileSync('/Users/yatishydv/.gemini/antigravity/brain/77526764-8bfd-4ada-857c-e5b54e73db0c/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');
    
    let html = '';
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const data = JSON.parse(lines[i]);
            if (data.type === 'USER_INPUT' && data.content && data.content.includes('frmStatementofAccounts.aspx')) {
                html = data.content;
                console.log(`Found HTML in transcript line ${i}`);
                break;
            }
        } catch (e) {}
    }

    if (!html) {
        console.log('No HTML user input found!');
        return;
    }

    console.log('Searching openapp.aspx links...');
    const regex = /openapp\.aspx\?([^\"]+)/gi;
    let match;
    const links = new Set();
    while ((match = regex.exec(html)) !== null) {
        links.add(match[0]);
    }

    console.log(`Found ${links.size} unique openapp links:`);
    for (const l of links) {
        if (l.toLowerCase().includes('account') || l.toLowerCase().includes('fee') || l.toLowerCase().includes('statement')) {
            console.log('⭐ MATCH:', l);
        } else {
            console.log('   ', l);
        }
    }
}

find();
