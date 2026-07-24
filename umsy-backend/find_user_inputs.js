import fs from 'fs';

const content = fs.readFileSync('/Users/yatishydv/.gemini/antigravity/brain/77526764-8bfd-4ada-857c-e5b54e73db0c/.system_generated/logs/transcript_full.jsonl', 'utf8');
console.log('File size in bytes:', content.length);
const lines = content.trim().split('\n');
console.log('Total lines:', lines.length);

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
        console.log(`Line ${i} is empty`);
        continue;
    }
    try {
        const data = JSON.parse(line);
        console.log(`Line ${i}: source=${data.source}, type=${data.type}`);
    } catch (e) {
        console.log(`Line ${i}: parse error: ${e.message}`);
    }
}
