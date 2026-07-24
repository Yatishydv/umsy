export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\./) 
        ? `http://${window.location.hostname}:3001/api` 
        : 'https://umsy-backend-production.up.railway.app/api');

console.log("🔌 UMSY API Base URL:", API_BASE_URL);

/**
 * Helper to construct the request body based on provided auth info
 * @param {string|object} auth - Either cookie string or { regno } or { cookies }
 */
const getAuthBody = (auth) => {
    if (typeof auth === 'string') return { cookies: auth };
    return auth; // Already an object like { regno: '...' } or { cookies: '...' }
};

/**
 * Check if the API is running
 */
export async function healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Server is down');
    return data;
}

/**
 * Start the login process
 */
export async function startLogin(regno, password) {
    const response = await fetch(`${API_BASE_URL}/start-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regno, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to start login');
    return data;
}

/**
 * Complete the login process
 */
export async function completeLogin(sessionId, captcha) {
    const response = await fetch(`${API_BASE_URL}/complete-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, captcha }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to complete login');
    return data;
}

/**
 * New login using Cloudflare Turnstile token (no captcha image needed)
 */
export async function newLogin(username, password, turnstileToken) {
    const response = await fetch(`${API_BASE_URL}/newlogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
}

/**
 * Fast HTTP Turnstile login (/v05login)
 */
export async function v05Login(username, password, turnstileToken) {
    const response = await fetch(`${API_BASE_URL}/v05login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error('Backend server error. Please ensure the backend server is running.');
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
}

/**
 * Get the current progress/status of a newLogin attempt
 */
export async function getNewLoginStatus(username) {
    const response = await fetch(`${API_BASE_URL}/newlogin-status/${username}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Status unavailable');
    return data;
}

/**
 * Get student basic information
 */
export async function getStudentInfo(auth) {
    const response = await fetch(`${API_BASE_URL}/student-info?cb=${Date.now()}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch student information');
    return data;
}

/**
 * Get student basic information for V04 token session (WebMethods only)
 */
export async function getStudentInfoV04(auth) {
    const response = await fetch(`${API_BASE_URL}/v04/student-info?cb=${Date.now()}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch student information');
    return data;
}

/**
 * Get student dashboard info for V04 token session directly (WebMethods only)
 */
export async function getStudentDashboardV04(auth) {
    const response = await fetch(`${API_BASE_URL}/v04/student-dashboard?cb=${Date.now()}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch student dashboard info');
    return data;
}

/**
 * Get student basic info for V04 token session directly (WebMethods only)
 */
export async function getStudentBasicInfoV04(auth) {
    const response = await fetch(`${API_BASE_URL}/v04/student-basic-info?cb=${Date.now()}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch student basic info');
    return data;
}

/**
 * Get student result for V04 token session directly (WebMethods only)
 */
export async function getResultV04(auth) {
    const response = await fetch(`${API_BASE_URL}/v04/result?cb=${Date.now()}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch result');
    return data;
}

/**
 * Get student marks for V04 token session directly (WebMethods only)
 */
export async function getMarksV04(auth) {
    const response = await fetch(`${API_BASE_URL}/v04/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch marks');
    return data;
}

/**
 * Get student messages for V04 token session directly (WebMethods only)
 */
export async function getMessagesV04(auth) {
    const response = await fetch(`${API_BASE_URL}/v04/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch messages');
    return data;
}

/**
 * Get student attendance data
 */
export async function getAttendance(auth) {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch attendance data');
    return data;
}

/**
 * Get detailed student attendance data (subject-wise)
 */
export async function getAttendanceDetails(auth) {
    const response = await fetch(`${API_BASE_URL}/attendance-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch attendance details');
    return data;
}

/**
 * Get term-wise marks data
 */
export async function getMarks(auth) {
    const response = await fetch(`${API_BASE_URL}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch marks');
    return data;
}

/**
 * Get student timetable
 */
export async function getTimeTable(auth) {
    const response = await fetch(`${API_BASE_URL}/timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch timetable');
    return data;
}

/**
 * Get student courses
 */
export async function getCourses(auth) {
    const response = await fetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch courses');
    return data;
}

/**
 * Get student seating plan
 * Always sends regno so the backend can perform fresh auth if cookies are stale
 */
export async function getSeatingPlan(auth, force = false) {
    try {
        const regno = localStorage.getItem('umsy_regno')?.trim() || '';
        const body = { ...getAuthBody(auth), ...(regno ? { regno } : {}), ...(force ? { force: true } : {}) };
        const response = await fetch(`${API_BASE_URL}/seating-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch seating plan');
        return data;
    } catch (error) {
        console.error('❌ Error in getSeatingPlan:', error);
        throw error;
    }
}


/**
 * Get student hostel information
 */
export async function getHostelInfo(auth) {
    const response = await fetch(`${API_BASE_URL}/hostel-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch hostel information');
    return data;
}

/**
 * Get the logged-in student's mutual shift post (by VID)
 */
export async function getMyMutualShiftPost(vid) {
    const response = await fetch(`${API_BASE_URL}/mutual-shift/${encodeURIComponent(vid)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch post');
    return data;
}

/**
 * Create a new mutual shift post
 */
export async function createMutualShiftPost(payload) {
    const response = await fetch(`${API_BASE_URL}/mutual-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create post');
    return data;
}

/**
 * Update an existing mutual shift post
 */
export async function updateMutualShiftPost(vid, updates) {
    const response = await fetch(`${API_BASE_URL}/mutual-shift/${encodeURIComponent(vid)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update post');
    return data;
}

/**
 * Delete a mutual shift post
 */
export async function deleteMutualShiftPost(vid) {
    const response = await fetch(`${API_BASE_URL}/mutual-shift/${encodeURIComponent(vid)}`, {
        method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete post');
    return data;
}

/**
 * Get all active mutual shift posts
 */
export async function getAllMutualShiftPosts() {
    const response = await fetch(`${API_BASE_URL}/mutual-shift`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch posts');
    return data;
}

/**
 * Get student result
 */
export async function getResult(auth) {
    const response = await fetch(`${API_BASE_URL}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch result');
    return data;
}

/**
 * Send message to AI Buddy
 */
export async function sendAIBuddyMessage(message, data, history) {
    const response = await fetch(`${API_BASE_URL}/ai-buddy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, data, history }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'AI Buddy error');
    return result;
}

/**
 * Save UMS session cookies to the backend
 */
export async function saveSession(regno, cookies) {
    const response = await fetch(`${API_BASE_URL}/save-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regno, cookies }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to save session');
    return data;
}

/**
 * Token-based login using registration number and date of birth
 * Validates against results.json and fetches UMS session cookies via stored token
 */
export async function tokenLogin(regno, dob) {
    const response = await fetch(`${API_BASE_URL}/token-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regno, dob }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
}

/**
 * Token-based login for V04 using registration number and password
 */
export async function tokenLoginV04(regno, password) {
    const response = await fetch(`${API_BASE_URL}/v04/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regno, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
}

/**
 * Get student ranking information
 */
export async function getRanking(registrationNumber) {
    const response = await fetch(`${API_BASE_URL}/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch ranking');
    return data;
}

/**
 * Get student pending assignments
 */
export async function getPendingAssignments(auth) {
    const response = await fetch(`${API_BASE_URL}/pending-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch pending assignments');
    return data;
}


/**
 * Fetch the Hostel Leave Slip URL
 */
export async function getLeaveSlipUrl(auth) {
    const response = await fetch(`${API_BASE_URL}/leave-slip-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch leave slip URL');
    return data;
}

/**
 * Fetch HTML directly from a cached Leave Slip URL
 */
export async function getLeaveSlipHtmlFromUrl(url, auth) {
    const response = await fetch(`${API_BASE_URL}/fetch-slip-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getAuthBody(auth), url }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch slip HTML');
    return data;
}

/**
 * Send raw timetable HTML to backend for parsing
 */
export async function parseTimeTable(html) {
    const response = await fetch(`${API_BASE_URL}/parse-timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to parse timetable');
    return data;
}

/**
 * Fetch student placement drive records and statistics
 */
export async function getPlacements(auth) {
    const response = await fetch(`${API_BASE_URL}/placements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch placements data');
    return data;
}


