document.addEventListener('DOMContentLoaded', () => {
    const statusBox = document.getElementById('statusBox');
    const syncBtn = document.getElementById('syncBtn');

    chrome.storage.local.get(['umsCookies', 'turnstileToken'], (data) => {
        if (data.umsCookies) {
            statusBox.innerHTML = '<span style="color:#4ade80;">✅ UMS Session Active!</span><br><span style="font-size:10px;color:#94a3b8;">Ready to auto-login on UMSY</span>';
        } else if (data.turnstileToken) {
            statusBox.innerHTML = '<span style="color:#38bdf8;">✅ Cloudflare Verified!</span>';
        } else {
            statusBox.innerHTML = '<span style="color:#f87171;">⚠️ Open UMS & Log in once</span>';
        }
    });

    syncBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.create({ url: 'https://umsy.vercel.app/v05login' });
        });
    });
});
