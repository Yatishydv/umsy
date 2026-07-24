const fs = require('fs');
const cheerio = require('cheerio');

// Copy the parsers from GetPlacements.js here
function parseFamilyDetailsPage(html) {
    const $ = cheerio.load(html);
    const family = { father: {}, mother: {} };
    
    // GridView inputs
    family.father.name = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl02_txtFName').val() || '';
    family.father.occupation = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl02_txtFDesignation').val() || '';
    family.father.phone = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl02_txtFContactNo').val() || '';
    
    family.mother.name = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl03_txtFName').val() || '';
    family.mother.occupation = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl03_txtFDesignation').val() || '';
    family.mother.phone = $('#ctl00_ContentPlaceHolder1_gvFamilyDetails_ctl03_txtFContactNo').val() || '';

    // If inputs not found, try text scraping
    if (!family.father.name) {
        $('span, label').each((i, el) => {
            const t = $(el).text().trim().toLowerCase();
            const val = $(el).next().text().trim() || $(el).parent().next().text().trim();
            if (t.includes('father name')) family.father.name = val;
            if (t.includes('father occupation')) family.father.occupation = val;
            if (t.includes('mother name')) family.mother.name = val;
            if (t.includes('mother occupation')) family.mother.occupation = val;
        });
    }

    return (family.father.name || family.mother.name) ? family : null;
}

function parseProfilePage(html) {
    const $ = cheerio.load(html);
    const profile = { 
        personal: {}, 
        academic: {}, 
        contact: {},
        other: {}
    };

    // Try to extract student photo
    const imgEl = $('img[id*="imgPhoto"], img[id*="StudentPhoto"], img[id*="imgStudent"]');
    if (imgEl.length > 0) {
        const src = imgEl.attr('src') || '';
        if (src.startsWith('data:')) {
            profile.photo = src;
        } else if (src) {
            profile.photo = src.startsWith('http') ? src : `https://ums.lpu.in/Placements/${src}`;
        }
    }

    // Process the alternating header/value rows
    const rows = $('table tr');
    let currentHeaders = [];

    rows.each((i, row) => {
        const cells = $(row).find('td');
        
        // Is this a header row? (contains <b> tags or looks like headers)
        if ($(row).find('b').length > 0 || $(row).find('.input_form_caption_td').length > 0) {
            // Check if it actually contains headers
            let hasHeaders = false;
            const tempHeaders = [];
            
            cells.each((j, cell) => {
                const text = $(cell).text().trim().replace(/:$/, '');
                tempHeaders.push(text);
                // If it contains a <b> tag, it's definitely a header row
                if ($(cell).find('b').length > 0 && text) hasHeaders = true;
            });
            
            if (hasHeaders) {
                currentHeaders = tempHeaders;
                return; // Next row will be values
            }
        }
        
        // If we have headers and this row has values
        if (currentHeaders.length > 0 && cells.length === currentHeaders.length) {
            cells.each((j, cell) => {
                const label = currentHeaders[j];
                const value = $(cell).text().trim();
                
                if (label && value && label !== 'Select') {
                    const keyStr = label.toLowerCase();
                    // Categorize the fields intelligently
                    if (keyStr.includes('name') || keyStr.includes('gender') || keyStr.includes('dob') || keyStr.includes('birth') || keyStr.includes('nationality')) {
                        profile.personal[label] = value;
                    } else if (keyStr.includes('email') || keyStr.includes('mobile') || keyStr.includes('phone') || keyStr.includes('address') || keyStr.includes('id') || keyStr.includes('whatsapp') || keyStr.includes('skype') || keyStr.includes('linkedin')) {
                        profile.contact[label] = value;
                    } else if (keyStr.includes('cgpa') || keyStr.includes('backlog') || keyStr.includes('degree') || keyStr.includes('batch') || keyStr.includes('marks') || keyStr.includes('year') || keyStr.includes('percentage') || keyStr.includes('term')) {
                        profile.academic[label] = value;
                    } else {
                        profile.other[label] = value;
                    }
                }
            });
            currentHeaders = []; // Reset after using
        }
    });

    return profile;
}

try {
    const familyHtml = fs.readFileSync('debug_family.html', 'utf8');
    console.log("=== FAMILY DATA ===");
    console.log(JSON.stringify(parseFamilyDetailsPage(familyHtml), null, 2));
} catch (e) {
    console.error("Family read error", e.message);
}

try {
    const profileHtml = fs.readFileSync('debug_profile.html', 'utf8');
    console.log("\n=== PROFILE DATA ===");
    console.log(JSON.stringify(parseProfilePage(profileHtml), null, 2));
} catch (e) {
    console.error("Profile read error", e.message);
}
