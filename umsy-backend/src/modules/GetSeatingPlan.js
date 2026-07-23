import * as cheerio from 'cheerio';
import axios from 'axios';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Fetch seating plan using puppeteer-extra + stealth (same engine as newlogin).
 *
 * Key insight: Plain Playwright is blocked by Cloudflare Turnstile on the UMS login page.
 * puppeteer-extra + stealth bypasses this, just like the main newlogin flow does.
 *
 * Flow:
 * 1. Look up regno + dob from MongoDB usertokens collection
 * 2. Login via puppeteer-stealth: fill regno → wait for password field → type dob → submit
 * 3. Navigate to StudentDashboard.aspx to fully activate the ASP.NET session
 * 4. Try GetSeatingPlan WebMethod with fresh session cookies
 * 5. If WebMethod empty, navigate openapp.aspx → capture studentums.lpu.in token URL
 * 6. Load the new portal and scrape seating plan data
 */
export async function fetchViaStealthPuppeteer(cookieString, regno) {
    let browser;

    try {
        // Look up the user's credentials from MongoDB
        let dob = null;
        try {
            const mongoose = await import('mongoose');
            const db = mongoose.default.connection.db;
            if (db) {
                const tokenDoc = await db.collection('usertokens').findOne({ regno });
                if (tokenDoc) {
                    dob = tokenDoc.dob || tokenDoc.password;
                    if (dob) console.log('🪑 [SeatingPlan] Found credentials for', regno);
                }
            }
        } catch (dbErr) {
            console.log('🪑 [SeatingPlan] Could not look up credentials from DB:', dbErr.message);
        }

        if (!dob) {
            console.log('🪑 [SeatingPlan] No DOB or password available for form login for', regno);
            return null;
        }

        const isProd = process.env.NODE_ENV === 'production';
        browser = await puppeteer.launch({
            headless: isProd ? true : 'new',
            executablePath: isProd ? undefined : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080',
                '--disable-features=IsolateOrigins,site-per-process',
                '--blink-features=AutomationControlled'
            ]
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        page.on('dialog', async dialog => {
            console.log('🪑 [SeatingPlan] Dismissing browser dialog:', dialog.message());
            await dialog.dismiss().catch(() => {});
        });

        // ── Step 1: Navigate to UMS login page ──────────────────────────────
        console.log('🪑 [SeatingPlan] Step 1: Navigating to UMS login...');
        // First navigate to a blank page to establish a stable context
        await page.goto('about:blank').catch(() => {});

        // Now inject cookies BEFORE navigating to UMS (needed for domain matching)
        if (cookieString) {
            try {
                const parsedCookies = cookieString.split(';').map(c => {
                    const parts = c.trim().split('=');
                    return {
                        name: parts[0],
                        value: parts.slice(1).join('='),
                        domain: 'ums.lpu.in',
                        path: '/'
                    };
                }).filter(c => c.name && c.value);
                if (parsedCookies.length > 0) {
                    await page.setCookie(...parsedCookies);
                    console.log('🪑 [SeatingPlan] Injected', parsedCookies.length, 'cookies');
                }
            } catch (cookieErr) {
                console.log('🪑 [SeatingPlan] Error setting cookies:', cookieErr.message);
            }
        }

        // Navigate with load event only to avoid networkidle2 execution context issues
        await page.goto('https://ums.lpu.in/lpuums/LoginNew.aspx', { waitUntil: 'load', timeout: 30000 })
            .catch(e => console.log('🪑 [SeatingPlan] Initial nav error (ok):', e.message?.substring(0, 80)));

        // Wait a bit then catch any additional redirect triggered by injected cookies
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'load', timeout: 8000 }),
            delay(8000)
        ]).catch(() => {});

        let currentPath = '';
        try {
            currentPath = page.url();
        } catch (e) {
            console.log('🪑 [SeatingPlan] Could not read URL, waiting longer...');
            await delay(3000);
            currentPath = page.url();
        }
        console.log('🪑 [SeatingPlan] Current URL after goto:', currentPath);
        if (currentPath.includes('StudentDashboard') || currentPath.includes('frm')) {
            console.log('🪑 [SeatingPlan] Already logged in via injected cookies!');
        } else {

            await page.waitForSelector('#txtU', { timeout: 15000, visible: true });
            await page.focus('#txtU');
            await page.type('#txtU', regno, { delay: 30 });
            await delay(500);

            // Trigger postback to reveal password field
            await page.evaluate(() => {
                const input = document.querySelector('#txtU');
                if (input) {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.blur();
                    if (typeof __doPostBack === 'function') __doPostBack('txtU', '');
                }
            });
            await delay(3500);

            // Check if password selector is present
            const passSelector = 'input[type="password"], input[placeholder*="Pass"]';
            await page.waitForSelector(passSelector, { timeout: 20000, visible: true });
            
            const passElem = await page.$(passSelector);
            if (passElem) {
                await passElem.focus();
                await passElem.type(dob, { delay: 30 });
                console.log('🪑 [SeatingPlan] Password entered');
            }
            await delay(500);

            // Handle Turnstile via mouse click if present
            try {
                const iframeElement = await page.$('iframe[src*="cloudflare"], iframe[src*="turnstile"]');
                if (iframeElement) {
                    const box = await iframeElement.boundingBox();
                    if (box) {
                        await page.mouse.click(box.x + Math.min(35, box.width / 2), box.y + box.height / 2);
                        console.log('🪑 [SeatingPlan] Clicked Turnstile widget');
                    }
                }
            } catch (e) {
                console.log('🪑 [SeatingPlan] Turnstile click trigger:', e.message?.substring(0, 60));
            }

            console.log('🪑 [SeatingPlan] Submitting login...');
            const submitBtn = await page.$('input[type="submit"][value="Login"]') || await page.$('input[type="submit"]');

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('🪑 [SeatingPlan] Submit nav:', e.message?.substring(0, 60))),
                (async () => {
                    if (submitBtn) {
                        await submitBtn.click().catch(async () => {
                            await page.evaluate(() => {
                                const btn = document.querySelector('input[type="submit"][value="Login"]') || document.querySelector('input[type="submit"]');
                                if (btn) btn.click();
                            });
                        });
                    } else {
                        await page.evaluate(() => {
                            const btn = document.querySelector('input[type="submit"][value="Login"]') || document.querySelector('input[type="submit"]');
                            if (btn) btn.click();
                        });
                    }
                })()
            ]);
            await delay(3000);

            // Check if SweetAlert is visible (e.g., "Please complete verification")
            // Only evaluate if we are on the same page (no navigation happened)
            let swalVisible = false;
            try {
                swalVisible = await page.evaluate(() => {
                    const okBtn = document.querySelector('.swal2-confirm');
                    if (okBtn) { okBtn.click(); return true; }
                    return false;
                });
            } catch (err) {
                console.log('🪑 [SeatingPlan] Swal check skipped (page navigated):', err.message?.substring(0, 60));
            }

            if (swalVisible) {
                console.log('🪑 [SeatingPlan] Dismissed SweetAlert. Re-submitting login...');
                await delay(2000);
                try {
                    await Promise.race([
                        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
                        page.click('input[type="submit"][value="Login"]').catch(() => {})
                    ]);
                } catch (navErr2) {
                    console.log('🪑 [SeatingPlan] Navigation after re-submit:', navErr2.message?.substring(0, 60));
                }
                await delay(3000);
            }
        }

        // Wait for page to fully settle after all login activity
        await delay(3000);

        // Handle concurrent session popup - wrap in try/catch in case page navigated
        let bodyText = '';
        try {
            bodyText = await page.evaluate(() => document.body?.innerText || '');
        } catch (err) {
            console.log('🪑 [SeatingPlan] Body text check error:', err.message?.substring(0, 60));
        }
        if (bodyText.includes('Previous Log in')) {
            console.log('🪑 [SeatingPlan] ⚠️ Concurrent session popup — dismissing...');
            try {
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('input, button, a'));
                    const target = btns.find(b =>
                        b.value?.toLowerCase().includes('logout') ||
                        b.innerText?.toLowerCase().includes('logout') ||
                        b.className?.includes('btn-location') ||
                        b.className?.includes('location-item')
                    );
                    if (target) target.click();
                });
            } catch (e) { /* ignore */ }
            await delay(3000);
            try {
                await Promise.race([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
                    page.click('input[type="submit"][value="Login"]').catch(() => {})
                ]);
            } catch (e) { /* ignore */ }
            await delay(3000);
        }


        const finalUrl = page.url();
        const finalTitle = await page.title();
        console.log('🪑 [SeatingPlan] URL after login:', finalUrl, '| Title:', finalTitle);

        const loginSuccess = 
            finalUrl.includes('StudentDashboard') || 
            finalUrl.includes('frm') || 
            finalTitle.includes('Lovely Professional University') ||
            (await page.evaluate(() => document.body.innerText.toLowerCase().includes('logout')));

        if (!loginSuccess) {
            console.log('🪑 [SeatingPlan] ❌ Login failed — still on login/blocker page');
            await browser.close();
            return null;
        }
        console.log('🪑 [SeatingPlan] ✅ Login successful!');

        // ── Step 2: Ensure we are fully logged into StudentDashboard or equivalent ───
        console.log('🪑 [SeatingPlan] Step 2: Ensuring active session and cookies...');
        // Let the page settle to finish navigation redirects
        await delay(5000);
        
        // If we are on the UMS dashboard page, make sure ASP.NET_SessionId cookie is read properly.
        // If we got redirected back to LoginNew, trigger submission again.
        if (page.url().includes('LoginNew.aspx') || page.url().endsWith('/lpuums') || page.url().endsWith('/lpuums/')) {
            console.log('🪑 [SeatingPlan] Got kicked out to LoginNew.aspx. Trying to re-submit...');
            await page.click('input[type="submit"][value="Login"]').catch(() => {});
            await delay(8000);
        }
        console.log('🪑 [SeatingPlan] Dashboard URL:', page.url());

        // ── Step 3: Try GetSeatingPlan WebMethod with fresh session ──────────
        console.log('🪑 [SeatingPlan] Step 3: Trying GetSeatingPlan WebMethod...');
        const freshCookies = await page.cookies();
        const freshCookieStr = freshCookies.map(c => `${c.name}=${c.value}`).join('; ');
        const hasSessionId = freshCookies.some(c => c.name === 'ASP.NET_SessionId');
        console.log('🪑 [SeatingPlan] Fresh cookies:', freshCookies.map(c => c.name).join(', '));
        console.log('🪑 [SeatingPlan] Has ASP.NET_SessionId:', hasSessionId);

        let seatingPlanResult = [];

        try {
            const webMethodResult = await axios.post(
                'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetSeatingPlan',
                {},
                {
                    headers: {
                        'Cookie': freshCookieStr,
                        'Content-Type': 'application/json; charset=UTF-8',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                }
            );

            const html = webMethodResult.data?.d;
            console.log('🪑 [SeatingPlan] WebMethod response length:', html?.length || 0);

            if (html && typeof html === 'string' && html.length > 10) {
                seatingPlanResult = parseOldUmsSeatingHtml(html);

                if (seatingPlanResult.length > 0) {
                    console.log('🪑 [SeatingPlan] ✅ Got', seatingPlanResult.length, 'entries from WebMethod!');
                    await browser.close();
                    return seatingPlanResult;
                }
            }
        } catch (wmErr) {
            console.log('🪑 [SeatingPlan] WebMethod failed:', wmErr.message);
        }

        // ── Step 4: Navigate openapp.aspx → capture studentums.lpu.in URL ───
        console.log('🪑 [SeatingPlan] Step 4: Navigating to openapp.aspx...');

        let capturedStudentUmsUrl = null;

        // Listen for requests to studentums
        page.on('request', req => {
            const url = req.url();
            if (url.includes('studentums.lpu.in') && url.includes('token=')) {
                capturedStudentUmsUrl = url;
                console.log('🪑 [SeatingPlan] ⭐ Captured studentums URL');
            }
        });

        const openappTarget = 'https://ums.lpu.in/lpuums/openapp.aspx?from=ums&toApp=nextproject&pagename=dashboard/examination/conduct/seatingplan';
        await page.goto(openappTarget, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        }).catch(e => console.log('🪑 [SeatingPlan] openapp load:', e.message?.substring(0, 80)));

        // Submit the ASP.NET form if present
        await page.evaluate(() => {
            const form = document.getElementById('form1');
            if (form) form.submit();
        });

        await delay(8000);
        let currentUrl = page.url();
        console.log('🪑 [SeatingPlan] URL after openapp:', currentUrl);

        // Handle concurrent session popup on redirect
        const redirectBody = await page.evaluate(() => document.body?.innerText || '');
        if (redirectBody.includes('Previous Log in') || currentUrl.includes('LoginNew.aspx')) {
            console.log('🪑 [SeatingPlan] Concurrent session on redirect — retrying...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('input, button, a'));
                const target = btns.find(b =>
                    b.value?.toLowerCase().includes('logout') ||
                    b.innerText?.toLowerCase().includes('logout') ||
                    b.className?.includes('btn-location')
                );
                if (target) target.click();
            });
            await delay(3000);
            await page.goto(openappTarget, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            await page.evaluate(() => { const f = document.getElementById('form1'); if (f) f.submit(); });
            await delay(8000);
            currentUrl = page.url();
            console.log('🪑 [SeatingPlan] URL after retry:', currentUrl);
        }

        if (currentUrl.includes('studentums.lpu.in')) {
            capturedStudentUmsUrl = currentUrl;
        }

        // Check for JS redirect
        if (!capturedStudentUmsUrl) {
            const pageHtml = await page.content();
            const redirectMatch = pageHtml.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/) ||
                                  pageHtml.match(/href=['"]([^'"]*studentums\.lpu\.in[^'"]*token[^'"]*)['"]/) ||
                                  pageHtml.match(/action=['"]([^'"]*studentums\.lpu\.in[^'"]*)['"]/) ;
            if (redirectMatch) {
                capturedStudentUmsUrl = redirectMatch[1];
                console.log('🪑 [SeatingPlan] Found redirect URL in page HTML');
            }
        }

        if (!capturedStudentUmsUrl) {
            console.log('🪑 [SeatingPlan] ❌ Could not capture studentums.lpu.in URL');
            const debugText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '');
            console.log('🪑 [SeatingPlan] Page text:', debugText);
            await browser.close();
            return [];
        }

        // ── Step 5: Load studentums.lpu.in and navigate to seating plan page ──────────
        console.log('🪑 [SeatingPlan] Step 5: Authenticating and loading studentums.lpu.in...');

        if (capturedStudentUmsUrl) {
            console.log('🪑 [SeatingPlan] Navigating to token URL:', capturedStudentUmsUrl);
            await page.goto(capturedStudentUmsUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 25000
            }).catch(e => console.log('🪑 [SeatingPlan] studentums token load:', e.message?.substring(0, 80)));
            await delay(4000);
        }

        const seatingRouteUrl = 'https://studentums.lpu.in/dashboard/examination/conduct/seatingplan';
        if (!page.url().includes('/examination/conduct/seatingplan')) {
            console.log('🪑 [SeatingPlan] Navigating explicitly to seating plan route...');
            await page.goto(seatingRouteUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 25000
            }).catch(e => console.log('🪑 [SeatingPlan] seatingplan route load:', e.message?.substring(0, 80)));
            await delay(3000);
        }

        // Wait for React/Next.js exam cards API to hydrate in DOM
        console.log('🪑 [SeatingPlan] Waiting for examination date sheet cards to hydrate...');
        await page.waitForFunction(
            () => {
                const text = document.body?.innerText || '';
                return /[A-Z]{2,5}\d{3,4}/.test(text) || text.includes('Date Sheet') || text.includes('Seating Plan');
            },
            { timeout: 15000 }
        ).catch(() => {});
        await delay(3000);

        const seatingData = await page.evaluate(() => {
            const results = [];
            const body = document.body?.innerText || '';

            // Strategy 1: Table-based layout
            document.querySelectorAll('table').forEach(table => {
                const headers = [];
                const headerRow = table.querySelector('thead tr, tr:first-child');
                if (headerRow) {
                    headerRow.querySelectorAll('th, td').forEach(cell => {
                        headers.push(cell.innerText.trim().toLowerCase().replace(/\s+/g, ' '));
                    });
                }
                table.querySelectorAll('tbody tr, tr').forEach((row, i) => {
                    if (i === 0 && headers.length > 0) return;
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const rowData = {};
                        cells.forEach((cell, j) => {
                            rowData[headers[j] || `col${j}`] = cell.innerText.trim();
                        });
                        if (Object.values(rowData).some(v => v.length > 0)) results.push(rowData);
                    }
                });
            });

            // Strategy 2: Line-by-line block parsing for studentums.lpu.in Examination Date Sheet cards
            if (results.length === 0 && body.length > 20) {
                const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const codeMatch = line.match(/\b([A-Z]{2,5}\d{3,4}[A-Z0-9]*)\b/);
                    if (codeMatch) {
                        const code = codeMatch[1];
                        const nearbyLines = lines.slice(i, Math.min(lines.length, i + 9));
                        const nearby = nearbyLines.join(' ');

                        // Extract Date: e.g. "29 Jul 2026" or "29/07/2026"
                        const dateMatch = nearby.match(/(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i) || nearby.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
                        
                        // Extract Time: e.g. "14:30-16:30" or "02:30 PM - 04:30 PM"
                        const timeMatch = nearby.match(/(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?)/);

                        // Extract Room: e.g. "33-306" or "Room 33-306"
                        const roomMatch = nearby.match(/\b(\d{1,3}-\d{3,4})\b/) || nearby.match(/Room\s*(?:No)?\.?\s*:?\s*([^\n\r,]+)/i);

                        // Extract Exam Type: e.g. "Practical End Term - ReAppear/Improvement"
                        const examMatch = nearby.match(/(Practical[^\n\r]*|End Term[^\n\r]*|Mid Term[^\n\r]*|ReAppear[^\n\r]*|Theory[^\n\r]*|Regular[^\n\r]*)/i);

                        // Extract Status
                        let status = 'Scheduled';
                        if (/upcoming/i.test(nearby)) status = 'Upcoming';
                        else if (/completed|done/i.test(nearby)) status = 'Completed';

                        // Check if entry already exists for this courseCode
                        let existing = results.find(r => r.courseCode === code);
                        if (!existing) {
                            existing = {
                                courseCode: code,
                                courseName: '',
                                date: '',
                                reportingTime: '',
                                room: '',
                                exam: '',
                                status: status,
                                instructions: ''
                            };
                            results.push(existing);
                        }

                        if (dateMatch && !existing.date) existing.date = dateMatch[1].trim();
                        if (timeMatch && !existing.reportingTime) existing.reportingTime = timeMatch[1].trim();
                        if (roomMatch && !existing.room) existing.room = roomMatch[1].trim();
                        if (examMatch && !existing.exam) existing.exam = examMatch[1].trim();
                        if (!existing.status || existing.status === 'Scheduled') existing.status = status;

                        // Extract course name if formatted as "INT332 - Data Science"
                        const nameMatch = line.match(/[A-Z]{2,5}\d{3,4}[A-Z0-9]*\s*[-:]\s*([^\n\r]+)/);
                        if (nameMatch && nameMatch[1].trim() && !existing.courseName) {
                            existing.courseName = nameMatch[1].trim();
                        }

                        // Instructions detection
                        if (/Instruction\s*-\s*Awaited|Awaited/i.test(nearby)) {
                            existing.instructionAwaited = true;
                        }
                    }
                }
            }

            return { results, pageText: body.substring(0, 3000), url: window.location.href, title: document.title };
        });

        console.log('🪑 [SeatingPlan] Page title:', seatingData.title);
        console.log('🪑 [SeatingPlan] Entries found:', seatingData.results?.length || 0);
        console.log('🪑 [SeatingPlan] Page text preview:', seatingData.pageText?.substring(0, 400));

        if (seatingData.results && seatingData.results.length > 0) {
            await browser.close();
            return seatingData.results.map(item => ({
                date: item.date || item.Date || item['date'] || '',
                courseCode: item.courseCode || item['course code'] || item['courseCode'] || '',
                courseName: item.courseName || item['course name'] || item['subject'] || item.Subject || '',
                status: item.status || item.Status || 'Scheduled',
                exam: item.exam || item.Exam || item['exam type'] || 'End Term Exam',
                room: item.room || item.Room || item['room no'] || item['room number'] || '',
                reportingTime: item.reportingTime || item['reporting time'] || item.Reporting || '',
                seatNo: item.seatNo || item['seat no'] || item['seat number'] || item.Seat || ''
            }));
        }

        // Check for "no exams" language
        const textLower = (seatingData.pageText || '').toLowerCase();
        if (
            textLower.includes('not scheduled') ||
            textLower.includes('no exam') ||
            textLower.includes('no data') ||
            textLower.includes('no seating')
        ) {
            console.log('🪑 [SeatingPlan] Portal says no exams scheduled');
            await browser.close();
            return [];
        }

        console.log('🪑 [SeatingPlan] No structured data found.');

        // If we got here, neither method found data
        console.log('🪑 [SeatingPlan] No seating plan data found via any method');
        await browser.close();
        return [];

    } catch (err) {
        console.error('🪑 [SeatingPlan] Error:', err.message);
        if (browser) await browser.close().catch(() => {});
        return null;
    }
}

/**
 * Parse seating plan HTML from the old UMS GetSeatingPlan WebMethod response
 */
export function parseOldUmsSeatingHtml(html) {
    const $ = cheerio.load(html);
    const plan = [];

    // Fallback card containers
    const containers = $('.mycoursesdiv').length > 0 
        ? $('.mycoursesdiv') 
        : $('[class*="card"], .border, [id*="seating"], [id*="Seating"]');

    containers.each((_, el) => {
        const container = $(el);
        const text = container.text().trim();
        if (!text || text.length < 10) return;

        let date = '';
        let courseCode = '';
        let courseName = '';
        let status = container.find('.badge, [class*="badge"], [class*="status"]').text().trim();
        let examText = '';
        let room = '';
        let reportingTime = '';

        // Try standard header match
        const headerText = container.find('.font-weight-medium').clone().children().remove().end().text().trim() || text;
        const headerMatch = headerText.match(/Date\s*:\s*([^\n]+?)(?:\s+([A-Z0-9]+)\s*:\s*(.+)|$)/i);
        if (headerMatch) {
            date = headerMatch[1]?.trim() || '';
            courseCode = headerMatch[2]?.trim() || '';
            courseName = headerMatch[3]?.trim() || '';
        }

        // Regex fallbacks for course, date, room, reporting time
        if (!courseCode) {
            const codeM = text.match(/([A-Z]{2,5}\d{3,4}[A-Z0-9]*)/);
            if (codeM) courseCode = codeM[1];
        }
        if (!date) {
            const dateM = text.match(/Date\s*:\s*([^\n\r]+)/i) || text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
            if (dateM) date = dateM[1].trim();
        }

        const roomM = text.match(/Room\s*(?:No)?\.?\s*:?\s*([^\n\r,]+)/i);
        if (roomM) room = roomM[1].trim();

        const reportM = text.match(/Report(?:ing)?\s*(?:Time)?\.?\s*:?\s*([^\n\r,]+)/i);
        if (reportM) reportingTime = reportM[1].trim();

        const examM = text.match(/Exam\s*:?\s*([^\n\r]+)/i);
        if (examM) examText = examM[1].trim();

        if (courseCode || date || room) {
            plan.push({
                date,
                courseCode,
                courseName,
                status: status || 'Scheduled',
                exam: examText,
                room,
                reportingTime
            });
        }
    });

    return plan;
}

/**
 * Main entry: fetch student seating plan
 */
export async function fetchStudentSeatingPlan(client) {
    const cookieString = client.defaults.headers['Cookie'] ||
                         client.defaults.headers.common?.['Cookie'] || '';
    const regno = client._regno || null;

    if (!cookieString && !regno) {
        console.log('🪑 [SeatingPlan] No cookies or regno available');
        return [];
    }

    console.log('🪑 [SeatingPlan] Starting seating plan fetch for', regno || 'unknown');

    // We only use the stored cookies fallback here.
    // The live browser-based fetch is now handled during login (/api/complete-login)
    // to avoid blocking the sync and preventing headless Turnstile errors.

    // Strategy 2: Try old WebMethod with stored cookies (may work if cookies have ASP.NET_SessionId)
    try {
        console.log('🪑 [SeatingPlan] Fallback: old WebMethod with stored cookies...');
        const response = await axios.post(
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
                timeout: 10000
            }
        );
        const html = response.data?.d;
        if (html && typeof html === 'string' && html.length > 10) {
            const plan = parseOldUmsSeatingHtml(html);
            if (plan.length > 0) return plan;
        }
    } catch (e) {
        console.log('🪑 [SeatingPlan] Fallback failed:', e.message);
    }

    return [];
}