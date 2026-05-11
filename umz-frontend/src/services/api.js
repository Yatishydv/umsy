const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\./) 
        ? `http://${window.location.hostname}:3001/api` 
        : 'https://umz-backend-ot1y.onrender.com/api');

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
    const response = await fetch(`${API_BASE_URL}/student-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getAuthBody(auth)),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch student information');
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
 */
export async function getSeatingPlan(auth) {
    try {
        const response = await fetch(`${API_BASE_URL}/seating-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getAuthBody(auth)),
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
