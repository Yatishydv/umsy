import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import SessionPool from './src/utils/SessionPool.js';
import { createAxiosClient } from './src/utils/createAxiosClient.js';
import { fetchStudentBasicInformation } from './src/modules/GetStudentBasicInformation.js';
import { fetchStudentAttendanceSummary } from './src/modules/StudentAttendanceSummary.js';
import { fetchStudentAttendanceDetail } from './src/modules/StudentAttendanceDetail.js';
import { fetchTermwiseCGPA } from './src/modules/TermwiseCGPA.js';
import { fetchTermWiseMarks } from './src/modules/TermWiseMarks.js';
import { fetchStudentMessages } from './src/modules/GetStudentMessages.js';
import { fetchTimeTable } from './src/modules/GetTimeTable.js';
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


const app = express();
const PORT = process.env.PORT || 3001;

// Initialize SessionPool with max 20 concurrent Playwright sessions
const sessionPool = new SessionPool(20);

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umz';
mongoose.connect(MONGO_URI)
    .then(() => console.log(`✅ MongoDB connected.`))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));

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
        message: 'UMZ Backend is running',
        timestamp: new Date().toISOString(),
        activeSessions: sessions.size,
        poolStatus: sessionPool.getStatus()
    });
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
            browser = await chromium.launch({ headless: false });
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
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
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

        // ── Stage 3: Wait 3.5s for DOM to update (password field appears) ─────
        console.log('[newlogin] Waiting 3.5s for ASP.NET DOM update...');
        loginStatus.set(username, { status: 'Waiting for password gateway...', percent: 45, timestamp: Date.now() });
        await delay(3500);

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

        // Fetch student basic information, term-wise CGPA, messages, and password expiry in parallel
        const [studentInfo, termwiseCGPA, messages, passwordExpiry] = await Promise.all([
            fetchStudentBasicInformation(axiosClient),
            fetchTermwiseCGPA(axiosClient),
            fetchStudentMessages(axiosClient),
            fetchPasswordExpiry(axiosClient)
        ]);

        // Combine the data
        const combinedData = {
            ...studentInfo,
            TermwiseCGPA: termwiseCGPA,
            Messages: messages,
            PasswordExpiry: passwordExpiry
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

        // console.log('📅 Fetching student timetable...');

        const axiosClient = createAxiosClient(cookies);

        // First, fetch courses to get the termId
        const coursesData = await fetchStudentCourses(axiosClient);

        if (!coursesData || coursesData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No courses found - cannot determine term ID'
            });
        }

        // Get termId from the first course
        const termId = coursesData[0].term;
        // console.log(`📋 Using Term ID: ${termId}`);

        // Fetch timetable with the termId
        const timetableData = await fetchTimeTable(axiosClient, termId);

        return res.json({
            success: true,
            data: timetableData
        });

    } catch (error) {
        // console.error('❌ Error fetching timetable:', error.message);

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
        // console.log(`🏆 Fetching ranking for: ${registrationNumber}`);

        const response = await axios.post(
            'https://lpu-student-ranking.vercel.app/get-student-info',
            { registrationNumber }
        );

        return res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        // console.error('❌ Error fetching ranking:', error.message);

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

