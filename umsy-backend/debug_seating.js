// Debug script: Test seating plan fetch step by step
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001';

async function testSeatingPlan() {
    // Get cookies from local storage (simulate what the frontend does)
    // First, let's just call the API directly
    const cookies = process.argv[2];
    
    if (!cookies) {
        console.log('Usage: node debug_seating.js "<cookie_string>"');
        console.log('\nTrying to call the backend API directly with cookies from the request...');
        
        // Call the API
        try {
            const res = await axios.post(`${BACKEND_URL}/api/seating-plan`, {
                cookies: ''  // Empty to test getEffectiveCookies fallback
            });
            console.log('API Response:', JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.log('API Error:', e.response?.data || e.message);
        }
        return;
    }

    console.log('=== Step 1: Hit openapp.aspx redirector ===');
    const openappUrl = 'https://ums.lpu.in/lpuums/openapp.aspx?from=ums&toApp=nextproject&pagename=dashboard/examination/conduct/seatingplan';
    
    try {
        const response = await axios.get(openappUrl, {
            headers: {
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });
        
        console.log('Response status:', response.status);
        console.log('Location header:', response.headers.location);
        
        if (response.status === 200) {
            const html = response.data;
            console.log('Got 200 response, HTML length:', html?.length);
            console.log('First 500 chars:', html?.substring(0, 500));
            
            // Check for meta refresh or JS redirect
            const metaRefresh = html?.match(/url=([^'"]+)/i);
            const jsRedirect = html?.match(/window\.location\.href\s*=\s*['"](.*?)['"]/i) ||
                              html?.match(/window\.location\.replace\s*\(\s*['"](.*?)['"]\s*\)/i) ||
                              html?.match(/window\.location\s*=\s*['"](.*?)['"]/i);
            
            console.log('Meta refresh match:', metaRefresh?.[1]);
            console.log('JS redirect match:', jsRedirect?.[1]);
        }
        
    } catch (e) {
        console.log('Error/Redirect status:', e.response?.status);
        console.log('Location header:', e.response?.headers?.location);
        
        const redirectUrl = e.response?.headers?.location;
        if (redirectUrl) {
            console.log('\n=== Step 2: Follow redirect to studentums.lpu.in ===');
            const fullUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://ums.lpu.in${redirectUrl}`;
            console.log('Full redirect URL:', fullUrl);
            
            try {
                const nextResponse = await axios.get(fullUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    maxRedirects: 5
                });
                
                console.log('Next response status:', nextResponse.status);
                console.log('Final URL:', nextResponse.request?.res?.responseUrl || 'unknown');
                console.log('HTML length:', nextResponse.data?.length);
                
                // Check for __next_f.push content
                const html = nextResponse.data;
                const nextFPushCount = (html.match(/self\.__next_f\.push/g) || []).length;
                console.log('Number of __next_f.push chunks:', nextFPushCount);
                
                // Look for seating plan related keys
                const seatingKeys = ['courseCode', 'course_code', 'courseName', 'course_name', 'room', 'seatNo', 'seat_no', 'reportingTime', 'seatingplan', 'seating'];
                for (const key of seatingKeys) {
                    const count = (html.match(new RegExp(key, 'gi')) || []).length;
                    if (count > 0) {
                        console.log(`  Found "${key}": ${count} occurrences`);
                    }
                }
                
                // Extract and show RSC payload chunks
                const regex = /self\.__next_f\.push\(\s*\[\s*\d+\s*,\s*"([\s\S]*?)"\s*\]\s*\)/g;
                let match;
                let chunkIndex = 0;
                while ((match = regex.exec(html)) !== null) {
                    let chunk = match[1]
                        .replace(/\\"/g, '"')
                        .replace(/\\'/g, "'")
                        .replace(/\\\\/g, '\\')
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t');
                    
                    // Only show chunks that might contain data
                    if (chunk.length > 50 && !chunk.includes('/_next/static/chunks/')) {
                        console.log(`\n--- RSC Chunk ${chunkIndex} (${chunk.length} chars) ---`);
                        console.log(chunk.substring(0, 300));
                    }
                    chunkIndex++;
                }
                
            } catch (nextErr) {
                console.log('Error fetching next page:', nextErr.message);
                console.log('Response status:', nextErr.response?.status);
            }
        }
    }
}

testSeatingPlan().catch(console.error);
