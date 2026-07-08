import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import SessionPool from './src/utils/SessionPool.js';
import { createAxiosClient } from './src/utils/createAxiosClient.js';
import { fetchStudentBasicInformation } from './src/modules/GetStudentBasicInformation.js';
import { fetchStudentContactNo } from './src/modules/GetStudentContactNo.js';
import { fetchStudentAttendanceSummary } from './src/modules/StudentAttendanceSummary.js';
import { fetchStudentAttendanceDetail } from './src/modules/StudentAttendanceDetail.js';
import { fetchTermwiseCGPA } from './src/modules/TermwiseCGPA.js';
import { fetchTermWiseMarks } from './src/modules/TermWiseMarks.js';
import { fetchStudentMessages } from './src/modules/GetStudentMessages.js';
import { fetchTimeTable, parseTimeTableHtml } from './src/modules/GetTimeTable.js';
import { fetchStudentCourses } from './src/modules/GetStudentCourses.js';
import { fetchStudentSeatingPlan } from './src/modules/GetSeatingPlan.js';
import { fetchPasswordExpiry } from './src/modules/GetPasswordExpiry.js';
import { fetchHostelInfo } from './src/modules/GetHostelInfo.js';
import { fetchStudentResult } from './src/modules/GetStudentResult.js';
import { getAIBuddyResponse } from './src/modules/AiBuddy.js';
import { fetchPendingAssignments } from './src/modules/GetPendingAssignments.js';
import { fetchLeaveSlipUid } from './src/modules/GetLeaveSlipUrl.js';
import MutualShiftPost from './src/models/MutualShiftPost.js';
import UserSession from './src/models/UserSession.js';
import StudentRanking from './src/models/StudentRanking.js';

// ── Load results.json into in-memory Map for O(1) token lookups ───────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resultsPath = path.resolve(__dirname, './results.json');
const studentTokenMap = new Map();
try {
    const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    for (const record of resultsData) {
        if (record.regno) {
            // If duplicate regnos exist (e.g. retry entries), keep the one with a valid token
            const existing = studentTokenMap.get(record.regno);
            if (!existing || (record.token && !existing.token)) {
                studentTokenMap.set(record.regno, record);
            }
        }
    }
    console.log(`✅ Loaded ${studentTokenMap.size} student records from results.json`);
} catch (err) {
    console.error('❌ Failed to load results.json:', err.message);
}

// ── Load credits.json into in-memory Map for O(1) credit lookups ────────────
const creditsPath = path.resolve(__dirname, './credits.json');
const courseCreditsMap = new Map();
try {
    const creditsData = JSON.parse(fs.readFileSync(creditsPath, 'utf-8'));
    for (const record of creditsData) {
        if (record.course_code) {
            const cleanKey = record.course_code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            courseCreditsMap.set(cleanKey, parseFloat(record.credit));
        }
    }
    console.log(`✅ Loaded ${courseCreditsMap.size} course credits from credits.json`);
} catch (err) {
    console.error('❌ Failed to load credits.json:', err.message);
}

/**
 * Helper to look up course credits using clean base matching (e.g. matching CSE111-L or CSE111A to CSE111).
 * @param {string} courseCode
 * @returns {number|null}
 */
function getCreditsForCourse(courseCode) {
    if (!courseCode) return null;
    const clean = courseCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // 1. Direct match (e.g. "CSE111")
    if (courseCreditsMap.has(clean)) {
        return courseCreditsMap.get(clean);
    }
    
    // 2. Base course prefix + digits match (e.g. "CSE111L" -> "CSE111", "CSE1112" -> "CSE111")
    const match = clean.match(/^([A-Z]+[0-9]+)/);
    if (match && courseCreditsMap.has(match[1])) {
        return courseCreditsMap.get(match[1]);
    }
    
    return null;
}



const app = express();
const PORT = process.env.PORT || 3001;

// Initialize SessionPool with max 20 concurrent Playwright sessions
const sessionPool = new SessionPool(20);

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umsy';
mongoose.connect(MONGO_URI)
    .then(() => console.log(`✅ MongoDB connected.`))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// Version enforcer middleware to block outdated native Android apps
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isApp = userAgent.includes('; wv') || userAgent.includes('WebView');

    // Only run check for API paths, ignoring app-version check itself
    if (isApp && req.path.startsWith('/api/') && req.path !== '/api/app-version') {
        const clientVersion = req.headers['x-umsy-version'];
        if (!clientVersion || parseInt(clientVersion) < 9) {
            console.log(`[security] Blocked outdated app request. UA: ${userAgent}, Version: ${clientVersion}`);
            return res.status(426).json({
                success: false,
                error: 'UPDATE_REQUIRED',
                message: 'You are using an outdated version of UMSY. Please download the latest update.'
            });
        }
    }
    next();
});

// In-memory session storage
// Structure: Map<sessionId, { browser, page, regno, password, timestamp }>
const sessions = new Map();

// Session timeout: 5 minutes
const SESSION_TIMEOUT = 5 * 60 * 1000;

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.timestamp > SESSION_TIMEOUT) {
            console.log(`🧹 Cleaning up expired session: ${sessionId}`);
            session.browser.close().catch(console.error);
            sessions.delete(sessionId);
        }
    }
}

// Run cleanup every minute
setInterval(cleanupExpiredSessions, 60 * 1000);

// In-memory status for long-running newlogin processes
// Structure: Map<username, { status, percent, timestamp }>
const loginStatus = new Map();

// In-memory storage for temporary downloads
const tempDownloads = new Map();

/**
 * POST /api/download-prepare
 * Stores base64 data temporarily and returns a download ID.
 */
app.post('/api/download-prepare', (req, res) => {
    const { base64, filename, contentType } = req.body;
    if (!base64 || !filename) {
        return res.status(400).json({ success: false, error: 'Missing data' });
    }

    const downloadId = uuidv4();
    tempDownloads.set(downloadId, {
        base64,
        filename,
        contentType,
        timestamp: Date.now()
    });

    // Cleanup after 1 minute
    setTimeout(() => tempDownloads.delete(downloadId), 60000);

    res.json({ success: true, downloadId });
});

/**
 * GET /api/download-file/:id/:filename
 * Serves the temporarily stored file with improved headers for Android.
 */
app.get('/api/download-file/:id/:filename', (req, res) => {
    const { id } = req.params;
    const download = tempDownloads.get(id);

    if (!download) {
        return res.status(404).send('Download expired or not found');
    }

    try {
        const buffer = Buffer.from(download.base64, 'base64');
        
        // Comprehensive headers for Android DownloadManager
        res.setHeader('Content-Type', download.contentType || 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `attachment; filename="${download.filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.send(buffer);
        
        // Keep in memory for a few more seconds in case of retries/resumes
        setTimeout(() => tempDownloads.delete(id), 10000);
    } catch (error) {
        res.status(500).send('Error processing download');
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'UMSY Backend is running',
        timestamp: new Date().toISOString(),
        activeSessions: sessions.size,
        poolStatus: sessionPool.getStatus()
    });
});

/**
 * GET /api/app-version
 * Get latest application version for force update checking
 */
app.get('/api/app-version', (req, res) => {
    res.json({
        latestVersionCode: 21,
        versionName: "2.12",
        forceUpdate: true
    });
});


/**
 * POST /api/generate-roast
 * Generates a highly personalized, sarcastic academic roast/quote using Groq API
 */
app.post('/api/generate-roast', async (req, res) => {
    try {
        const { name, cgpa, attendance, timeOfDay, backlogs } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
        
        if (!GROQ_API_KEY) {
            return res.json({ success: false, error: 'Groq API Key not configured' });
        }

        const prompt = `Write a single, short, highly sarcastic, funny, one-liner academic roast or motivation.
Student Details:
- First Name: ${name || 'Student'}
- CGPA: ${cgpa || 'N/A'}
- Attendance: ${attendance || 'N/A'}%
- Backlogs count: ${backlogs || 0}
- Time of Day: ${timeOfDay || 'day'}

Rules:
- Keep it under 15 words.
- Be very witty, slightly sarcastic but friendly.
- Directly refer to their name.
- Do NOT include any greeting or introduction.
- Return ONLY the roast string, nothing else.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 50
            })
        });

        const result = await response.json();
        const roast = result?.choices?.[0]?.message?.content?.trim().replace(/"/g, '') || '';
        
        return res.json({ success: true, roast });
    } catch (e) {
        console.error('Failed to generate roast:', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});


/**
 * POST /api/start-login
 * Start the login process - fill regno and get captcha
 */
app.post('/api/start-login', async (req, res) => {
    const { regno, password } = req.body;

    if (!regno || !password) {
        return res.status(400).json({
            success: false,
            error: 'Registration number and password are required'
        });
    }

    // Log pool status before acquiring
    const poolStatus = sessionPool.getStatus();
    console.log(`📊 Pool Status: ${poolStatus.active}/${poolStatus.maxActive} active, ${poolStatus.queued} queued, ${poolStatus.available} available`);

    let browser, page;

    try {
        // Execute within session pool to enforce concurrency limit
        const result = await sessionPool.run(async () => {
            // console.log(`🌐 Starting login process for: ${regno}`);

            // Launch browser
            browser = await chromium.launch({ headless: process.env.NODE_ENV === 'production' });
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
            page = await context.newPage();

            // Navigate to login page
            // console.log('📄 Loading login page...');
            await page.goto('https://ums.lpu.in/lpuums/', { waitUntil: 'networkidle' });

            // Fill registration number
            // console.log('📝 Entering registration number...');
            const regnoField = page.locator('input[name="txtU"]');
            await regnoField.click();
            await page.waitForTimeout(300);
            await regnoField.type(regno, { delay: 100 });
            await page.waitForTimeout(500);
            await regnoField.blur();

            // Wait for captcha to load
            // console.log('🖼️  Waiting for captcha...');
            await page.waitForSelector('#c_loginnew_examplecaptcha_CaptchaImage', { timeout: 10000 });

            // Screenshot captcha and convert to base64
            const captchaElement = await page.$('#c_loginnew_examplecaptcha_CaptchaImage');
            const captchaBuffer = await captchaElement.screenshot();
            const captchaBase64 = `data:image/png;base64,${captchaBuffer.toString('base64')}`;

            // Generate session ID
            const sessionId = uuidv4();

            // Store session
            sessions.set(sessionId, {
                browser,
                page,
                regno,
                password,
                timestamp: Date.now()
            });

            // console.log(`✅ Session created: ${sessionId}`);

            return {
                success: true,
                sessionId,
                captchaImage: captchaBase64
            };
        });

        return res.json(result);

    } catch (error) {
        console.error('❌ Error in start-login:', error.message);

        // Cleanup on error
        if (browser) {
            await browser.close().catch(console.error);
        }

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/complete-login
 * Complete the login - fill captcha and password, then login
 */
app.post('/api/complete-login', async (req, res) => {
    const { sessionId, captcha } = req.body;

    if (!sessionId || !captcha) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and captcha are required'
        });
    }

    // Retrieve session
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found or expired'
        });
    }

    const { browser, page, password } = session;

    try {
        // console.log(`🔐 Completing login for session: ${sessionId}`);

        // Fill captcha
        // console.log('✍️  Filling captcha...');
        const captchaField = page.locator('input[name="CaptchaCodeTextBox"]');
        await captchaField.click();
        await page.waitForTimeout(200);
        await captchaField.type(captcha, { delay: 120 });
        await page.waitForTimeout(400);

        // Fill password
        // console.log('🔑 Filling password...');
        const pwdField = page.locator('input[type="password"]');
        await pwdField.click();
        await page.waitForTimeout(200);
        await pwdField.type(password, { delay: 100 });
        await page.waitForTimeout(600);

        // Select Dashboard option in dropdown
        // console.log('📋 Selecting Dashboard option...');
        const dropdown = page.locator('select[name="ddlStartWith"]');
        await dropdown.selectOption({ value: 'StudentDashboard.aspx' });
        await page.waitForTimeout(300);

        // Click login button
        // console.log('🔘 Clicking login...');
        const loginButton = page.locator('input[type="submit"][value="Login"]');
        await loginButton.click();
        await page.waitForTimeout(300);

        // Wait for navigation result
        try {
            // Wait for URL but also wait for network to be idle to ensure cookies are processed
            await page.waitForURL('**/StudentDashboard.aspx', { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });
            
            // Prove we are REALLY logged in by waiting for a dashboard-specific element
            // Most UMS pages have a form with ID 'form1' or a specific student info container
            await page.waitForSelector('body', { timeout: 5000 });
            
            // console.log('✅ Reached Dashboard URL:', page.url());
        } catch (error) {
            const currentUrl = page.url();
            console.error('❌ Failed to reach Dashboard. Current URL:', currentUrl);
            if (currentUrl.includes('lpuums/') && !currentUrl.includes('StudentDashboard')) {
                throw new Error('Login failed - Invalid credentials or captcha');
            }
            throw error;
        }

        // Extract cookies
        // console.log('🍪 Extracting all cookies from Playwright context...');
        const context = page.context();
        const allCookies = await context.cookies();
        
        // Log detailed cookie info for debugging
        /*
        console.log('📊 Detailed Cookie Report:');
        allCookies.forEach(c => {
            console.log(`   - [${c.domain}] ${c.name} (Path: ${c.path}, Secure: ${c.secure}, HttpOnly: ${c.httpOnly})`);
        });
        */

        const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

        // console.log('✅ Final Cookie String length:', cookieString.length);
        
        // UMS Masquerades ASP.NET_SessionId as _ga_B0Z6G6GCD8
        const hasSession = cookieString.includes('ASP.NET_SessionId') || cookieString.includes('_ga_B0Z6G6GCD8');
        const hasLPU = cookieString.includes('LPU');
        
        if (hasSession || hasLPU) {
            // console.log('🛡️  Authentication cookies found! (Session verified)');
        } else {
            // console.warn('⚠️  CRITICAL WARNING: No UMS authentication cookies found!');
        }

        // Close browser and cleanup session
        await browser.close();
        sessions.delete(sessionId);

        return res.json({
            success: true,
            cookies: cookieString
        });

    } catch (error) {
        console.error('❌ Error in complete-login:', error.message);

        // Cleanup on error
        await browser.close().catch(console.error);
        sessions.delete(sessionId);

        return res.status(401).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/newlogin
 * Turnstile-bypass login: accepts a pre-solved Cloudflare turnstile token,
 * injects it into the UMS page and logs in without ever needing a captcha image.
 *
 * Body: { username, password, turnstileToken }
 * Response: { success, cookies }
 */
// Per-user lock — prevents duplicate concurrent newlogin calls
const newLoginActiveSessions = new Map();

/**
 * POST /api/newlogin
 * Ports the exact umsy login bridge:
 *  - puppeteer-extra + StealthPlugin (bypasses bot detection)
 *  - networkidle2 navigation (allows 2 idle connections, unlike playwright networkidle)
 *  - Username injected via page.evaluate + __doPostBack in one call
 *  - Turnstile token injected from frontend; keyboard-tab fallback if not provided
 *  - Returns cookie string which the frontend stores in localStorage
 */
app.post('/api/newlogin', async (req, res) => {
    let { username, password, turnstileToken } = req.body;
    username = username?.trim();
    password = password?.trim();

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'username and password are required'
        });
    }

    if (newLoginActiveSessions.has(username)) {
        return res.status(429).json({ success: false, error: 'Login already in progress for this user. Please wait.' });
    }
    newLoginActiveSessions.set(username, Date.now());
    loginStatus.set(username, { status: 'Initializing...', percent: 5, timestamp: Date.now() });

    console.log(`[newlogin] >>> Starting login for: ${username}`);

    let browser;
    try {
        const isProd = process.env.NODE_ENV === 'production';
        browser = await puppeteer.launch({
            headless: true,
            executablePath: isProd ? undefined : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
                '--remote-debugging-port=0'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Auto-dismiss any unexpected alerts so they don't hang the scraper
        page.on('dialog', async dialog => {
            console.log(`[newlogin] Auto-dismissed alert: ${dialog.message()}`);
            await dialog.dismiss().catch(() => {});
        });

        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        // ── Stage 2: Navigate to UMS ─────────────────────────────────────────
        // networkidle2 = max 2 active connections (puppeteer term)
        // This is equivalent to playwright's 'load' but more lenient on background polls
        console.log('[newlogin] Navigating to UMS...');
        loginStatus.set(username, { status: 'Navigating to UMS...', percent: 15, timestamp: Date.now() });
        await page.goto('https://ums.lpu.in/lpuums/', { waitUntil: 'networkidle2', timeout: 60000 });

        // ── Stage 2: Fill username via DOM + trigger ASP.NET postback ─────────
        console.log('[newlogin] Entering username and triggering postback...');
        loginStatus.set(username, { status: 'Identifying account...', percent: 30, timestamp: Date.now() });
        await page.waitForSelector('#txtU', { timeout: 15000, visible: true });
        await page.click('#txtU');

        await page.evaluate((val) => {
            const input = document.querySelector('#txtU');
            input.value = val;
            // Direct ASP.NET postback — reveals the password field
            if (typeof __doPostBack === 'function') {
                __doPostBack('txtU', '');
            }
        }, username);

        // ── Stage 3: Wait for DOM to update (password field appears) ─────
        console.log('[newlogin] Waiting for password field to appear...');
        loginStatus.set(username, { status: 'Waiting for password gateway...', percent: 45, timestamp: Date.now() });

        // ── Stage 3: Type password ────────────────────────────────────────────
        const passSelector = 'input[type="password"], input[placeholder*="Pass"]';
        console.log('[newlogin] Entering password...');
        loginStatus.set(username, { status: 'Submitting credentials...', percent: 60, timestamp: Date.now() });
        await page.waitForSelector(passSelector, { timeout: 15000, visible: true });
        await page.click(passSelector);
        await page.type(passSelector, password, { delay: 50 });

        // ── Stage 3: Inject Turnstile token ───────────────────────────────────
        let turnstileSolved = false;

        if (turnstileToken) {
            console.log('[newlogin] Injecting Turnstile token from frontend...');
            await page.evaluate((token) => {
                const input = document.querySelector('[name="cf-turnstile-response"]');
                if (input) input.value = token;
            }, turnstileToken);
            turnstileSolved = true;
        }

        // Keyboard-based fallback solve loop (if no token provided)
        if (!turnstileSolved) {
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`[newlogin] Turnstile solve attempt ${attempt}/3...`);
                const turnstilePresent = await page.evaluate(() =>
                    !!document.querySelector('iframe[src*="cloudflare"]') ||
                    !!document.querySelector('.cf-turnstile')
                );

                if (turnstilePresent) {
                    await page.focus(passSelector);
                    await page.keyboard.press('Tab');
                    await delay(500);
                    await page.keyboard.press('Space');
                    try {
                        await page.waitForFunction(() => {
                            const inp = document.querySelector('[name="cf-turnstile-response"]');
                            return inp && inp.value && inp.value.length > 0;
                        }, { timeout: 15000 });
                        turnstileSolved = true;
                        console.log('[newlogin] Turnstile solved via keyboard.');
                        break;
                    } catch { console.log('[newlogin] Turnstile solve timeout.'); }
                } else {
                    turnstileSolved = true; // not present
                    break;
                }
            }
        }

        // ── Submission ────────────────────────────────────────────────────────
        const loginBtnSelector = 'input[type="submit"][value="Login"]';
        console.log('[newlogin] Submitting login form...');
        loginStatus.set(username, { status: 'Securing session...', percent: 80, timestamp: Date.now() });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
            page.click(loginBtnSelector).catch(() => {})
        ]);

        // Handle SweetAlert popup (wrong captcha/credentials warning)
        const swalConfirm = await page.$('.swal2-confirm');
        if (swalConfirm) {
            console.log('[newlogin] Dismissing post-click popup...');
            await swalConfirm.click();
            await delay(2000);
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
                page.click(loginBtnSelector).catch(() => {})
            ]);
        }

        const finalUrl = page.url();
        console.log(`[newlogin] Final URL: ${finalUrl}`);

        const isOnLoginPage = finalUrl.includes('Login') || finalUrl.endsWith('/lpuums/') || finalUrl.endsWith('/lpuums');
        const isChromeError = finalUrl.includes('chrome-error');

        if (isChromeError) {
            await browser.close();
            newLoginActiveSessions.delete(username);
            return res.status(503).json({ success: false, error: 'UMS portal is unreachable. Please try again.' });
        }

        if (isOnLoginPage) {
            const errorText = await page.evaluate(() => {
                return document.querySelector('#lockerror')?.innerText?.trim()
                    || document.querySelector('.swal2-html-container')?.innerText?.trim()
                    || document.querySelector('.alert-danger')?.innerText?.trim()
                    || 'Login failed. Please verify your credentials and try again.';
            });
            await browser.close();
            newLoginActiveSessions.delete(username);
            return res.status(401).json({ success: false, error: errorText });
        }

        // ── Stage 5: Extract cookies and return ───────────────────────────────
        console.log('[newlogin] Login successful! Extracting cookies...');
        loginStatus.set(username, { status: 'Synchronizing cookies...', percent: 95, timestamp: Date.now() });
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`[newlogin] ✅ Cookie string length: ${cookieString.length}`);

        await browser.close();
        newLoginActiveSessions.delete(username);
        loginStatus.delete(username);

        return res.json({ success: true, cookies: cookieString });

    } catch (error) {
        console.error('[newlogin] Error:', error.message);
        if (browser) await browser.close().catch(console.error);
        newLoginActiveSessions.delete(username);
        loginStatus.delete(username);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/newlogin-status/:username
 */
app.get('/api/newlogin-status/:username', (req, res) => {
    const username = req.params.username?.trim();
    const status = loginStatus.get(username);
    if (!status) {
        return res.status(404).json({ success: false, error: 'No active login session found' });
    }
    res.json(status);
});

/**
 * POST /api/save-session
 * Save UMS cookies for a student to enable data fetching without sending cookies in every request
 */
app.post('/api/save-session', async (req, res) => {
    const { regno, cookies } = req.body;

    if (!regno || !cookies) {
        return res.status(400).json({
            success: false,
            error: 'Registration number and cookies are required'
        });
    }

    try {
        await UserSession.findOneAndUpdate(
            { regno },
            { cookies, updatedAt: Date.now() },
            { upsert: true, new: true }
        );

        return res.json({
            success: true,
            message: 'Session saved successfully'
        });
    } catch (error) {
        console.error('❌ Error saving session:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to save session'
        });
    }
});

/**
 * GET /api/test-cloudflare
 * Diagnostic endpoint to see exactly what Cloudflare displays to the server.
 */
app.get('/api/test-cloudflare', async (req, res) => {
    let browser;
    try {
        console.log('[test-cf] Launching Playwright browser...');
        const { chromium } = await import('playwright');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        console.log('[test-cf] Navigating to UMS Login...');
        await page.goto('https://ums.lpu.in/lpuums/Login.aspx', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        await page.waitForTimeout(5000);
        
        const pageTitle = await page.title();
        const pageUrl = page.url();
        const htmlSnippet = (await page.content()).substring(0, 1000);
        
        console.log('[test-cf] Taking screenshot...');
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        const base64Image = screenshotBuffer.toString('base64');
        
        await browser.close();
        
        res.send(`
            <html>
                <body style="font-family: sans-serif; padding: 20px; background: #f0f0f0;">
                    <h2>Cloudflare Diagnostic Result</h2>
                    <p><b>URL:</b> ${pageUrl}</p>
                    <p><b>Title:</b> ${pageTitle}</p>
                    <p><b>Snippet:</b></p>
                    <pre style="background: #fff; padding: 10px; border: 1px solid #ccc; max-height: 200px; overflow: auto;">${htmlSnippet.replace(/</g, '&lt;')}</pre>
                    <h3>Screenshot:</h3>
                    <img src="data:image/png;base64,${base64Image}" style="border: 2px solid #000; max-width: 100%;" />
                </body>
            </html>
        `);
    } catch (err) {
        console.error('[test-cf] Diagnostic failed:', err.message);
        if (browser) await browser.close().catch(() => {});
        res.status(500).send(`Error: ${err.message}`);
    }
});

/**
 * Helper to get cookies from body or DB
 */
async function getEffectiveCookies(req) {
    const { cookies, regno } = { ...req.body, ...req.query };
    
    if (cookies) return cookies;
    
    if (regno) {
        const session = await UserSession.findOne({ regno });
        if (session) return session.cookies;
    }
    
    return null;
}

/**
 * POST /api/student-info
 * Fetch student basic information using stored cookies
 */
app.post('/api/student-info', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        // console.log('📊 Fetching student information...');

        // Create axios client with cookies
        const axiosClient = createAxiosClient(cookies);

        // Fetch student basic information, term-wise CGPA, messages, and contact number in parallel
        const [studentInfo, termwiseCGPA, messages, contactNo] = await Promise.all([
            fetchStudentBasicInformation(axiosClient),
            fetchTermwiseCGPA(axiosClient),
            fetchStudentMessages(axiosClient).catch(err => {
                console.warn('⚠️ Could not fetch messages in student-info:', err.message);
                return [];
            }),
            // fetchPasswordExpiry(axiosClient),
            fetchStudentContactNo(axiosClient).catch(err => {
                console.warn('⚠️ Could not fetch contact number:', err.message);
                return { phoneNumber: '' };
            })
        ]);

        // Combine the data
        const combinedData = {
            ...studentInfo,
            StudentMobile: studentInfo.StudentMobile || contactNo?.phoneNumber || '',
            TermwiseCGPA: termwiseCGPA,
            Messages: messages,
            // PasswordExpiry: passwordExpiry
        };

        return res.json({
            success: true,
            data: combinedData,
            cookies: cookies // Return the cookies used (whether from body or DB)
        });

    } catch (error) {
        // console.error('❌ Error fetching student info:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v04/student-info
 * V04 Student Info: fetches student basic information and contact number using WebMethods only (no .aspx document pages)
 */
app.post('/api/v04/student-info', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        const axiosClient = createAxiosClient(cookies);

        const [studentInfo, termwiseCGPA, messages, contactNo] = await Promise.all([
            fetchStudentBasicInformation(axiosClient),
            fetchTermwiseCGPA(axiosClient),
            fetchStudentMessages(axiosClient).catch(err => {
                console.warn('⚠️ Could not fetch V04 messages in student-info:', err.message);
                return [];
            }),
            fetchStudentContactNo(axiosClient).catch(err => {
                console.warn('⚠️ Could not fetch contact number:', err.message);
                return { phoneNumber: '' };
            })
        ]);

        const combinedData = {
            ...studentInfo,
            StudentMobile: studentInfo.StudentMobile || contactNo?.phoneNumber || '',
            TermwiseCGPA: termwiseCGPA,
            Messages: messages
        };

        return res.json({
            success: true,
            data: combinedData,
            cookies: cookies
        });

    } catch (error) {
        console.error('❌ Error fetching V04 student info:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v04/student-dashboard
 * POST /api/v04/student-basic-info
 * V04 Student Dashboard/Basic Information: calls the GetStudentBasicInformation WebMethod directly with cookies and returns the response
 */
const handleStudentDashboardV04 = async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        const axiosClient = createAxiosClient(cookies);

        // Fetch basic info, messages, and contact number in parallel
        const [infoResponse, messages, contactNo] = await Promise.all([
            axiosClient.post(
                'https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentBasicInformation',
                {},
                {
                    headers: {
                        'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
                    }
                }
            ),
            fetchStudentMessages(axiosClient).catch(err => {
                console.warn('⚠️ Could not fetch V04 messages in dashboard:', err.message);
                return [];
            }),
            fetchStudentContactNo(axiosClient).catch(err => {
                console.warn('⚠️ Could not fetch V04 contact number:', err.message);
                return { phoneNumber: '' };
            })
        ]);

        const d = infoResponse.data?.d || [];
        const studentInfo = d[0] || {};
        const filteredInfo = {};
        for (const [key, value] of Object.entries(studentInfo)) {
            if (value !== null && value !== '') {
                filteredInfo[key] = value;
            }
        }

        // Include messages and contact number in data
        filteredInfo.StudentMobile = filteredInfo.StudentMobile || contactNo?.phoneNumber || '';
        filteredInfo.Messages = messages;

        return res.json({
            success: true,
            d: d,
            data: filteredInfo,
            cookies: cookies
        });

    } catch (error) {
        console.error('❌ Error fetching V04 student dashboard/basic info:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

app.post('/api/v04/student-dashboard', handleStudentDashboardV04);
app.post('/api/v04/student-basic-info', handleStudentDashboardV04);

/**
 * POST /api/v04/messages
 * V04 Student Messages: calls the GetStudentMessages WebMethod directly with cookies and parses the HTML
 */
app.post('/api/v04/messages', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        const axiosClient = createAxiosClient(cookies);
        const messages = await fetchStudentMessages(axiosClient);

        return res.json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error('❌ Error fetching V04 student messages:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v04/result
 * V04 Student Result: calls the TermWiseCGPA WebMethod directly with cookies,
 * parses the HTML result, and maps it to standard result format (skipping credit fetching from frmStudentResult.aspx)
 */
app.post('/api/v04/result', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({ success: false, error: 'Cookies or registration number are required' });
        }

        const axiosClient = createAxiosClient(cookies);
        const response = await axiosClient.post(
            'https://ums.lpu.in/lpuums/StudentDashboard.aspx/TermWiseCGPA',
            {},
            {
                headers: {
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'
                }
            }
        );

        const html = response.data?.d;
        if (!html || typeof html !== 'string') {
            return res.json({
                success: true,
                data: {
                    cgpa: null,
                    semesters: [],
                    rplGrades: []
                }
            });
        }

        const $ = cheerio.load(html);
        const semesters = [];

        $('h4').each((_, el) => {
            const text = $(el).text().trim();
            if (!text.startsWith('Term :')) return;

            const termId = text.replace('Term :', '').trim();

            // TGPA is in the sibling column
            const tgpa = $(el)
                .closest('.row')
                .find('h4')
                .last()
                .text()
                .replace('TGPA :', '')
                .trim();

            const tableDiv = $(el).closest('.row').nextAll('div.table-responsive').first();
            const table = tableDiv.find('table').first();

            const subjects = [];

            table.find('tbody tr').each((_, row) => {
                const cols = $(row).find('td');
                const courseRaw = $(cols[0]).text().trim();
                const gradeRaw = $(cols[1]).text().replace('Grade :', '').trim();

                // Split "CSE111 :: ORIENTATION TO COMPUTING-I"
                const sepIdx = courseRaw.indexOf('::');
                const code = sepIdx !== -1 ? courseRaw.slice(0, sepIdx).trim() : '';
                const name = sepIdx !== -1 ? courseRaw.slice(sepIdx + 2).trim() : courseRaw;
                const grade = gradeRaw || null;

                const credit = getCreditsForCourse(code);

                subjects.push({
                    code,
                    name,
                    credit,
                    grade
                });
            });

            semesters.push({
                termId,
                tgpa,
                subjects
            });
        });

        const resultData = {
            cgpa: null,
            semesters,
            rplGrades: []
        };

        return res.json({
            success: true,
            data: resultData
        });

    } catch (error) {
        console.error('❌ Error fetching V04 student result:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v04/marks
 * V04 Student Marks: calls the TermWiseMarks WebMethod directly with cookies and returns the parsed marks data
 */
app.post('/api/v04/marks', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({ success: false, error: 'Cookies or registration number are required' });
        }

        const axiosClient = createAxiosClient(cookies);
        const marksData = await fetchTermWiseMarks(axiosClient);

        // Enrich marks with credits from credits.json if missing/null
        if (marksData) {
            marksData.forEach(term => {
                if (term.subjects) {
                    term.subjects.forEach(sub => {
                        if (sub.credit === null || sub.credit === undefined || isNaN(sub.credit)) {
                            sub.credit = getCreditsForCourse(sub.courseCode);
                        }
                    });
                }
            });
        }

        return res.json({
            success: true,
            data: marksData
        });

    } catch (error) {
        console.error('❌ Error fetching V04 student marks:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


/**
 * POST /api/attendance
 * Fetch student attendance data using stored cookies
 */
app.post('/api/attendance', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        // console.log('📊 Fetching attendance data...');

        // Create axios client with cookies
        const axiosClient = createAxiosClient(cookies);

        // Fetch both summary and detailed attendance
        const [summary, detail] = await Promise.all([
            fetchStudentAttendanceSummary(axiosClient),
            fetchStudentAttendanceDetail(axiosClient)
        ]);

        return res.json({
            success: true,
            data: {
                summary,
                detail
            }
        });

    } catch (error) {
        // console.error('❌ Error fetching attendance:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/attendance-details
 * Fetch detailed subject-wise attendance using stored cookies
 */
app.post('/api/attendance-details', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        // console.log('📊 Fetching detailed attendance data...');

        // Create axios client with cookies
        const axiosClient = createAxiosClient(cookies);

        // Fetch detail and summary in parallel so we can use UMS's official percent per subject
        const [attendanceDetail, attendanceSummary] = await Promise.all([
            fetchStudentAttendanceDetail(axiosClient),
            fetchStudentAttendanceSummary(axiosClient)
        ]);

        // Build a lookup map: courseCode → summary row (for fast matching)
        const summaryMap = new Map();
        for (const row of attendanceSummary) {
            if (row.courseCode) {
                summaryMap.set(row.courseCode, row);
            }
        }

        // Merge the official UMS percent + duty leave + lastDate into each detail course
        const merged = attendanceDetail.map(course => {
            const summaryRow = summaryMap.get(course.courseCode);
            return {
                ...course,
                // UMS-official percentage string (e.g. "82.35%") from summary; null if not matched
                summaryPercent: summaryRow ? summaryRow.percent : null,
                // Duty leave / OD count from summary
                od: summaryRow ? summaryRow.od : null,
                // Last attendance date from summary
                lastDate: summaryRow ? summaryRow.lastDate : null,
                // Full course title from summary
                courseTitle: summaryRow ? summaryRow.course : null,
            };
        });

        return res.json({
            success: true,
            data: merged
        });

    } catch (error) {
        // console.error('❌ Error fetching attendance details:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/health
 * Health check endpoint with session pool stats
 */
app.get('/api/health', (req, res) => {
    const poolStatus = sessionPool.getStatus();
    res.json({
        status: 'ok',
        activeSessions: sessions.size,
        pool: {
            active: poolStatus.active,
            maxActive: poolStatus.maxActive,
            queued: poolStatus.queued,
            available: poolStatus.available
        }
    });
});

/**
 * POST /api/token-login
 * Token-based login: validates regno + dob against results.json,
 * fetches UMS session cookies using the stored token, and returns them.
 */
app.post('/api/token-login', async (req, res) => {
    let { regno, dob } = req.body;
    regno = regno?.trim();
    dob = dob?.trim();

    if (!regno || !dob) {
        return res.status(400).json({
            success: false,
            error: 'Registration number and date of birth are required'
        });
    }

    // Look up the student record
    const record = studentTokenMap.get(regno);

    if (!record) {
        return res.status(404).json({
            success: false,
            error: 'Registration number not found'
        });
    }

    // Validate DOB (results.json uses dd-mm-yyyy format)
    if (record.dob !== dob) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials — date of birth does not match'
        });
    }

    // Check if token exists
    if (!record.token) {
        return res.status(500).json({
            success: false,
            error: 'No token available for this student. Please use the standard login instead.'
        });
    }

    try {
        console.log(`[token-login] Fetching cookies for ${regno} (${record.name})...`);

        const tokenUrl = `https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=${record.token}==`;

        // Make the GET request, collecting cookies across redirects
        // We use maxRedirects: 0 to manually handle and capture Set-Cookie headers
        let allCookies = [];
        let currentUrl = tokenUrl;
        let maxHops = 10;

        while (maxHops-- > 0) {
            try {
                const response = await axios.get(currentUrl, {
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 200 && status < 400,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    // Include collected cookies in subsequent requests
                    ...(allCookies.length > 0 && {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Cookie': allCookies.map(c => `${c.name}=${c.value}`).join('; ')
                        }
                    })
                });

                // Extract Set-Cookie headers
                const setCookies = response.headers['set-cookie'];
                if (setCookies) {
                    for (const cookieStr of setCookies) {
                        const parts = cookieStr.split(';')[0].split('=');
                        const name = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        // Update or add cookie
                        const existing = allCookies.findIndex(c => c.name === name);
                        if (existing >= 0) {
                            allCookies[existing].value = value;
                        } else {
                            allCookies.push({ name, value });
                        }
                    }
                }

                // Check for redirect
                if (response.status >= 300 && response.status < 400 && response.headers.location) {
                    const location = response.headers.location;
                    // Handle relative URLs
                    if (location.startsWith('http')) {
                        currentUrl = location;
                    } else {
                        const base = new URL(currentUrl);
                        currentUrl = new URL(location, base).href;
                    }
                    continue;
                }

                // Success — no more redirects
                break;
            } catch (axiosErr) {
                // axios throws on 3xx when maxRedirects: 0, handle it
                if (axiosErr.response) {
                    const resp = axiosErr.response;
                    // Extract cookies from error response too
                    const setCookies = resp.headers['set-cookie'];
                    if (setCookies) {
                        for (const cookieStr of setCookies) {
                            const parts = cookieStr.split(';')[0].split('=');
                            const name = parts[0].trim();
                            const value = parts.slice(1).join('=').trim();
                            const existing = allCookies.findIndex(c => c.name === name);
                            if (existing >= 0) {
                                allCookies[existing].value = value;
                            } else {
                                allCookies.push({ name, value });
                            }
                        }
                    }

                    if (resp.status >= 300 && resp.status < 400 && resp.headers.location) {
                        const location = resp.headers.location;
                        if (location.startsWith('http')) {
                            currentUrl = location;
                        } else {
                            const base = new URL(currentUrl);
                            currentUrl = new URL(location, base).href;
                        }
                        continue;
                    }
                    // Non-redirect error
                    break;
                }
                throw axiosErr;
            }
        }

        if (allCookies.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to obtain session cookies from UMS. Token may be expired.'
            });
        }

        const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`[token-login] ✅ Got ${allCookies.length} cookies for ${regno} (length: ${cookieString.length})`);

        return res.json({
            success: true,
            cookies: cookieString,
            name: record.name
        });

    } catch (error) {
        console.error(`[token-login] ❌ Error for ${regno}:`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch session from UMS. Please try again later.'
        });
    }
});

/**
 * POST /api/v04/login
 * V04 Token-based login: validates regno against results.json,
 * fetches UMS session cookies using the stored token, and returns them.
 */
app.post('/api/v04/login', async (req, res) => {
    let { regno, password } = req.body;
    regno = regno?.trim();
    password = password?.trim();

    if (!regno || !password) {
        return res.status(400).json({
            success: false,
            error: 'Registration number and password are required'
        });
    }

    // Look up the student record
    const record = studentTokenMap.get(regno);

    if (!record) {
        return res.status(404).json({
            success: false,
            error: 'Registration number not found'
        });
    }

    // Check if token exists
    if (!record.token) {
        return res.status(400).json({
            success: false,
            error: 'No token available for this student.'
        });
    }

    // Verify password against OAS LPU unless bypass password is provided
    let isPasswordVerified = false;
    const bypassPass = process.env.BYPASS_PASSWORD || 'Yash@2009';
    if (password === bypassPass) {
        console.log(`[v04-login] Admin password bypass triggered for ${regno}`);
        isPasswordVerified = true;
    } else {
        try {
            console.log(`[v04-login] Verifying password for ${regno} against OAS...`);
            const params = new URLSearchParams();
            params.append('LoginId', regno);
            params.append('Password', password);

            const oasResponse = await axios.post(
                'https://oas.lpu.in/Home/NewLoginMethod',
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 200 && status < 400
                }
            );

            const responseCookies = oasResponse.headers['set-cookie'] || [];
            const oasCookie = responseCookies.find(cookie =>
                cookie.startsWith('OASvalue=')
            );
            const token = oasCookie?.match(/^OASvalue=([^;]*)/)?.[1] || '';
            if (token.trim().length > 0) {
                isPasswordVerified = true;
            }
        } catch (oasErr) {
            console.warn(`[v04-login] Verification warning for ${regno}:`, oasErr.message);
            // Also inspect headers on error/redirect response just in case
            if (oasErr.response) {
                const responseCookies = oasErr.response.headers['set-cookie'] || [];
                const oasCookie = responseCookies.find(cookie =>
                    cookie.startsWith('OASvalue=')
                );
                const token = oasCookie?.match(/^OASvalue=([^;]*)/)?.[1] || '';
                if (token.trim().length > 0) {
                    isPasswordVerified = true;
                }
            }
        }
    }

    if (!isPasswordVerified) {
        return res.status(401).json({
            success: false,
            error: 'Invalid password. Please check your credentials.'
        });
    }

    try {
        console.log(`[v04-login] Fetching cookies for ${regno} (${record.name})...`);

        const tokenUrl = `https://ums.lpu.in/lpuums/frmSickStudentFoodRequest.aspx?uid=${record.token}==`;

        // Make the GET request, collecting cookies across redirects using Playwright to bypass Cloudflare
        let allCookies = [];
        let browser;
        try {
            const { chromium } = await import('playwright');
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            const page = await context.newPage();
            console.log(`[v04-login] Playwright loading token URL: ${tokenUrl}`);
            await page.goto(tokenUrl, {
                waitUntil: 'networkidle',
                timeout: 60000
            });

            // Settle time for ASP.NET / session validation scripts
            await page.waitForTimeout(2000);

            const pageTitle = await page.title();
            const pageUrl = page.url();
            console.log(`[v04-login] Playwright reached page: "${pageTitle}" at URL: ${pageUrl}`);

            const playwrightCookies = await context.cookies();
            allCookies = playwrightCookies.map(c => ({
                name: c.name,
                value: c.value
            }));

        } catch (pwErr) {
            console.error(`[v04-login] Playwright cookie fetch failed:`, pwErr.message);
            throw pwErr;
        } finally {
            if (browser) {
                await browser.close().catch(() => {});
            }
        }

        if (allCookies.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to obtain session cookies from UMS. Token may be expired.'
            });
        }

        // Warm the session by calling the GetStudentCourses WebMethod — this triggers
        // full ASP.NET session initialization required by ReportViewer pages like the timetable.
        try {
            const warmCookieStr = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
            console.log(`[v04-login] 🔑 Warming session via GetStudentCourses WebMethod...`);
            const dashResp = await axios.post('https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses', {}, {
                headers: {
                    'Cookie': warmCookieStr,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            console.log(`[v04-login] 🔑 Session warming status: ${dashResp.status}`);
            
            // Merge any new cookies from the dashboard
            const dashSetCookies = dashResp.headers['set-cookie'];
            if (dashSetCookies) {
                for (const cookieStr of dashSetCookies) {
                    const parts = cookieStr.split(';')[0].split('=');
                    const name = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    const existing = allCookies.findIndex(c => c.name === name);
                    if (existing >= 0) {
                        allCookies[existing].value = value;
                    } else {
                        allCookies.push({ name, value });
                    }
                }
                console.log(`[v04-login] 🔄 Merged dashboard cookies. Total: ${allCookies.length}`);
            }
        } catch (dashErr) {
            console.warn(`[v04-login] ⚠️ Dashboard warm failed (non-fatal):`, dashErr.message);
        }

        const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`[v04-login] ✅ Got ${allCookies.length} cookies for ${regno} (length: ${cookieString.length})`);
        console.log(`[v04-login] 🍪 Cookie names: ${allCookies.map(c => c.name).join(', ')}`);

        return res.json({
            success: true,
            cookies: cookieString,
            name: record.name
        });

    } catch (error) {
        console.error(`[v04-login] ❌ Error for ${regno}:`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch session from UMS. Please try again later.'
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 UMS Backend Server running on http://localhost:${PORT}`);
    // console.log(`📡 Accepting requests from React frontend`);
});

/**
 * POST /api/leave-slip-url
 * Generates the Hostel Leave Slip URL by following redirects
 */
app.post('/api/leave-slip-url', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);
        if (!cookies) return res.status(400).json({ success: false, error: 'Auth required' });

        const axiosClient = createAxiosClient(cookies);
        const result = await fetchLeaveSlipUid(axiosClient);

        if (!result || !result.uid) {
            return res.status(500).json({ success: false, error: 'Could not generate leave slip' });
        }

        const leaveSlipUrl = `https://ums.lpu.in/lpuums/frmHostelLeaveSlipTest.aspx?uid=${result.uid}`;
        
        res.json({
            success: true,
            url: leaveSlipUrl,
            data: result.data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/fetch-slip-html
 * Fetches HTML directly from a provided UMS URL (used for cached URL fast-access)
 */
app.post('/api/fetch-slip-html', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

        const cookies = await getEffectiveCookies(req);
        if (!cookies) return res.status(400).json({ success: false, error: 'Auth required' });

        const axiosClient = createAxiosClient(cookies);
        const { fetchSlipDataFromUrl } = await import('./src/modules/GetLeaveSlipUrl.js');
        const data = await fetchSlipDataFromUrl(axiosClient, url);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/student-image
 * Proxies student images from UMS to bypass cookie/CORS issues in WebView
 */
app.get('/api/student-image', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).send('URL required');

        // Use the robust cookie helper used by other endpoints
        const cookies = await getEffectiveCookies(req);
        if (!cookies) return res.status(401).send('Auth required');

        const axiosClient = createAxiosClient(cookies);
        const response = await axiosClient.get(url, { 
            responseType: 'arraybuffer',
            timeout: 10000 
        });
        
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(response.data);
    } catch (error) {
        console.error('Image Proxy Error:', error.message);
        res.status(500).send(error.message);
    }
});

/**
 * POST /api/result
 * Fetch student result (subjects, credits, grades, CGPA) grouped by semester
 */
app.post('/api/result', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({ success: false, error: 'Cookies or registration number are required' });
        }

        // console.log('📋 Fetching student result...');
        const axiosClient = createAxiosClient(cookies);
        const resultData = await fetchStudentResult(axiosClient);

        // Enrich resultData with credits from credits.json if missing/null
        if (resultData) {
            if (resultData.semesters) {
                resultData.semesters.forEach(sem => {
                    if (sem.subjects) {
                        sem.subjects.forEach(sub => {
                            if (sub.credit === null || sub.credit === undefined || isNaN(sub.credit)) {
                                sub.credit = getCreditsForCourse(sub.code);
                            }
                        });
                    }
                });
            }
            if (resultData.rplGrades) {
                resultData.rplGrades.forEach(sem => {
                    if (sem.subjects) {
                        sem.subjects.forEach(sub => {
                            if (sub.credit === null || sub.credit === undefined || isNaN(sub.credit)) {
                                sub.credit = getCreditsForCourse(sub.code);
                            }
                        });
                    }
                });
            }
        }

        return res.json({ success: true, data: resultData });
    } catch (error) {
        // console.error('❌ Error fetching result:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/marks
 * Fetch term-wise marks data using stored cookies
 */
app.post('/api/marks', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        // console.log('📊 Fetching term-wise marks...');

        const axiosClient = createAxiosClient(cookies);
        const marksData = await fetchTermWiseMarks(axiosClient);

        // Enrich marks with credits from credits.json if missing/null
        if (marksData) {
            marksData.forEach(term => {
                if (term.subjects) {
                    term.subjects.forEach(sub => {
                        if (sub.credit === null || sub.credit === undefined || isNaN(sub.credit)) {
                            sub.credit = getCreditsForCourse(sub.courseCode);
                        }
                    });
                }
            });
        }

        return res.json({
            success: true,
            data: marksData
        });

    } catch (error) {
        // console.error('❌ Error fetching marks:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/timetable
 * Fetch student timetable using stored cookies
 */
app.post('/api/timetable', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        console.log(`📅 Timetable request. Cookie length: ${cookies.length}, has ASP.NET_SessionId: ${cookies.includes('ASP.NET_SessionId')}`);

        const axiosClient = createAxiosClient(cookies);

        // First, fetch courses to get the termId
        let coursesData;
        try {
            coursesData = await fetchStudentCourses(axiosClient);
            console.log(`📚 Courses fetched: ${coursesData ? coursesData.length : 0} courses`);
        } catch (courseErr) {
            console.error('❌ fetchStudentCourses failed:', courseErr.message);
            throw courseErr;
        }

        if (!coursesData || coursesData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No courses found - cannot determine term ID'
            });
        }

        // Get termId from the first course and convert suffix to A/W for Autumn/Winter session timetable
        let termId = String(coursesData[0].term || '');
        if (termId.endsWith('1')) {
            termId = termId.slice(0, -1) + 'A';
        } else if (termId.endsWith('2')) {
            termId = termId.slice(0, -1) + 'W';
        }
        console.log(`📋 Using Term ID: ${termId}`);

        // Fetch timetable with the termId
        let timetableData;
        try {
            timetableData = await fetchTimeTable(axiosClient, termId);
            console.log(`📅 Timetable fetched successfully`);
        } catch (ttErr) {
            console.error('❌ fetchTimeTable failed:', ttErr.message);
            if (ttErr.response) {
                console.error(`   HTTP Status: ${ttErr.response.status}`);
                console.error(`   Response data (first 500 chars):`, typeof ttErr.response.data === 'string' ? ttErr.response.data.substring(0, 500) : JSON.stringify(ttErr.response.data).substring(0, 500));
            }
            throw ttErr;
        }

        return res.json({
            success: true,
            data: timetableData
        });

    } catch (error) {
        console.error('❌ Timetable route error:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/parse-timetable
 * Parse raw HTML of timetable page manually uploaded/pasted by user
 */
app.post('/api/parse-timetable', async (req, res) => {
    try {
        const { html } = req.body;
        if (!html || typeof html !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'HTML content is required'
            });
        }

        console.log(`📋 Received raw HTML for manual parsing, length: ${html.length} chars`);
        const parsedData = parseTimeTableHtml(html);
        return res.json({
            success: true,
            data: parsedData
        });
    } catch (error) {
        console.error('❌ Manual timetable parse error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/courses
 * Fetch student courses using stored cookies
 */
app.post('/api/courses', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        // console.log('📚 Fetching student courses...');

        const axiosClient = createAxiosClient(cookies);
        const coursesData = await fetchStudentCourses(axiosClient);

        return res.json({
            success: true,
            data: coursesData
        });

    } catch (error) {
        // console.error('❌ Error fetching courses:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/pending-assignments
 * Fetch student pending assignments using stored cookies
 */
app.post('/api/pending-assignments', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        const axiosClient = createAxiosClient(cookies);
        const assignments = await fetchPendingAssignments(axiosClient);

        return res.json({
            success: true,
            data: assignments
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/seating-plan
 * Fetch student seating plan using stored cookies
 */
app.post('/api/seating-plan', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({
                success: false,
                error: 'Cookies or registration number are required'
            });
        }

        // console.log('🪑 Fetching student seating plan...');

        const axiosClient = createAxiosClient(cookies);
        const seatingPlanData = await fetchStudentSeatingPlan(axiosClient);

        // console.log(`✅ Seating plan fetched successfully. Items: ${seatingPlanData?.length || 0}`);
        // console.log('📤 Sending response:', JSON.stringify({
        //     success: true,
        //     data: seatingPlanData
        // }).substring(0, 300));

        return res.json({
            success: true,
            data: seatingPlanData
        });

    } catch (error) {
        // console.error('❌ Error fetching seating plan:', error.message);
        // console.error('Stack:', error.stack);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/hostel-info
 * Fetch student hostel information (VID, Name, Hostel, Room No)
 */
app.post('/api/hostel-info', async (req, res) => {
    try {
        const cookies = await getEffectiveCookies(req);

        if (!cookies) {
            return res.status(400).json({ success: false, error: 'Cookies or registration number are required' });
        }

        // console.log('🏠 Fetching hostel info...');
        const axiosClient = createAxiosClient(cookies);
        const hostelData = await fetchHostelInfo(axiosClient);

        return res.json({ success: true, data: hostelData });
    } catch (error) {
        // console.error('❌ Error fetching hostel info:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/mutual-shift
 * Get all active mutual shift posts
 */
app.get('/api/mutual-shift', async (req, res) => {
    try {
        const posts = await MutualShiftPost.find({ isActive: true }).sort({ createdAt: -1 });
        return res.json({ success: true, data: posts });
    } catch (error) {
        // console.error('❌ Error fetching mutual shift posts:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/mutual-shift/:vid
 * Get a specific student's mutual shift post
 */
app.get('/api/mutual-shift/:vid', async (req, res) => {
    try {
        const post = await MutualShiftPost.findOne({ vid: req.params.vid });
        return res.json({ success: true, data: post || null });
    } catch (error) {
        // console.error('❌ Error fetching post:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/mutual-shift
 * Create a new mutual shift post
 */
app.post('/api/mutual-shift', async (req, res) => {
    const { vid, name, currentHostel, currentRoom, desiredHostel, desiredRoom } = req.body;

    if (!vid || !name || !currentHostel || !currentRoom || !desiredHostel) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        const post = new MutualShiftPost({ vid, name, currentHostel, currentRoom, desiredHostel, desiredFloor: '', desiredRoom: desiredRoom || '' });
        await post.save();
        return res.status(201).json({ success: true, data: post });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, error: 'You already have an active post. Delete it first or use edit.' });
        }
        // console.error('❌ Error creating post:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/mutual-shift/:vid
 * Update an existing mutual shift post
 */
app.put('/api/mutual-shift/:vid', async (req, res) => {
    const { desiredHostel, desiredRoom } = req.body;

    try {
        const post = await MutualShiftPost.findOneAndUpdate(
            { vid: req.params.vid },
            { desiredHostel, desiredRoom: desiredRoom || '' },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        return res.json({ success: true, data: post });
    } catch (error) {
        // console.error('❌ Error updating post:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/mutual-shift/:vid
 * Delete a mutual shift post
 */
app.delete('/api/mutual-shift/:vid', async (req, res) => {
    try {
        const result = await MutualShiftPost.findOneAndDelete({ vid: req.params.vid });

        if (!result) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        return res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        // console.error('❌ Error deleting post:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ranking
 * Proxy endpoint for student ranking - avoids CORS issues
 */
app.post('/api/ranking', async (req, res) => {
    const { registrationNumber } = req.body;

    if (!registrationNumber) {
        return res.status(400).json({
            success: false,
            error: 'Registration number is required'
        });
    }

    try {
        const studentRecord = await StudentRanking.findOne({ RegistrationNumber: String(registrationNumber) }).lean();
        if (studentRecord) {
            console.log(`🏆 Found ranking for: ${registrationNumber} in MongoDB database.`);
            return res.json({
                success: true,
                data: studentRecord
            });
        }
    } catch (e) {
        console.warn('⚠️ Error querying MongoDB for rankings:', e.message);
    }

    const localRankingsPath = path.resolve(__dirname, './current_rankings.json');
    if (fs.existsSync(localRankingsPath)) {
        try {
            const list = JSON.parse(fs.readFileSync(localRankingsPath, 'utf8'));
            const studentRecord = list.find(s => String(s.RegistrationNumber) === String(registrationNumber));
            if (studentRecord) {
                console.log(`🏆 Found ranking for: ${registrationNumber} in local rankings cache.`);
                return res.json({
                    success: true,
                    data: studentRecord
                });
            }
        } catch (e) {
            console.warn('⚠️ Error reading local rankings file:', e.message);
        }
    }

    try {
        console.log(`🏆 Fetching ranking for: ${registrationNumber} from new API`);

        const response = await axios.get(
            `https://ranking2-0.vercel.app/api/search?regNo=${registrationNumber}`
        );

        const rawData = response.data;

        // Map the new response structure to the old structure to maintain compatibility for dashboard
        let percentage = null;
        if (rawData.percentile) {
            percentage = parseFloat(rawData.percentile.replace('%', ''));
        }

        let totalStudents = 0;
        if (rawData.overallRank && percentage) {
            totalStudents = Math.round(rawData.overallRank / (percentage / 100));
        }
        if (!totalStudents || isNaN(totalStudents)) {
            totalStudents = 7500;
        }

        let batchYear = "N/A";
        if (rawData.regNo && rawData.regNo.length >= 3) {
            const digits = rawData.regNo.substring(1, 3);
            if (!isNaN(digits)) {
                batchYear = `20${digits}`;
            }
        }

        const mappedData = {
            Name: rawData.name || "N/A",
            RegistrationNumber: rawData.regNo || registrationNumber,
            Course: rawData.program || "N/A",
            BatchYear: batchYear,
            CGPA: rawData.cgpa || "N/A",
            State: "N/A",
            Country: "India",
            Rank: rawData.overallRank || 0,
            Percentage: percentage,
            TotalStudents: totalStudents,
            Gender: "N/A",
            // Include raw data keys as well:
            regNo: rawData.regNo,
            name: rawData.name,
            cgpa: rawData.cgpa,
            program: rawData.program,
            companySelectedIn: rawData.companySelectedIn,
            email: rawData.email,
            contactNo: rawData.contactNo,
            placementId: rawData.placementId,
            basicDetails: rawData.basicDetails,
            status: rawData.status,
            opportunityStartDate: rawData.opportunityStartDate,
            reappearBacklog: rawData.reappearBacklog,
            pepFeeDetails: rawData.pepFeeDetails,
            pepFeePaymentDate: rawData.pepFeePaymentDate,
            xMarks: rawData.xMarks,
            xiiMarks: rawData.xiiMarks,
            graduationMarks: rawData.graduationMarks,
            diplomaMarks: rawData.diplomaMarks,
            scrapedAt: rawData.scrapedAt,
            overallRank: rawData.overallRank,
            percentile: rawData.percentile
        };

        return res.json({
            success: true,
            data: mappedData
        });

    } catch (error) {
        console.error('❌ Error fetching ranking from new API:', error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
});

// ── AI Buddy ──────────────────────────────────────────────────────────────
app.post('/api/ai-buddy', async (req, res) => {
    const { message, data, history } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });
    try {
        const reply = await getAIBuddyResponse(message, data || {}, history || []);
        res.json({ success: true, reply });
    } catch (err) {
        // console.error('❌ AI Buddy error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

