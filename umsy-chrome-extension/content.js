(function() {
    console.log('⚡ UMSY Chrome Extension Active!');

    // 1. On UMS Login page: Auto-detect Turnstile Token
    if (window.location.hostname.includes('ums.lpu.in')) {
        const turnstileCheck = setInterval(() => {
            try {
                const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
                if (turnstileInput && turnstileInput.value && turnstileInput.value.length > 20) {
                    chrome.storage.local.set({ turnstileToken: turnstileInput.value });
                    window.postMessage({ type: 'UMSY_TURNSTILE_TOKEN', token: turnstileInput.value }, '*');
                }
            } catch (e) {}

            // Detect ASP.NET Session Cookie when logged in
            if (document.cookie && document.cookie.includes('ASP.NET_SessionId=')) {
                chrome.storage.local.set({ umsCookies: document.cookie });
            }
        }, 500);
    }

    // 2. On UMSY Website: Automatically inject extension presence & relay session
    if (window.location.hostname.includes('umsy.vercel.app') || window.location.hostname === 'localhost') {
        window.UMSY_EXTENSION_INSTALLED = true;
        document.body.setAttribute('data-umsy-extension', 'installed');

        // Relay stored cookies/tokens to UMSY window
        chrome.storage.local.get(['umsCookies', 'turnstileToken'], (data) => {
            if (data.umsCookies) {
                window.postMessage({ type: 'UMSY_AUTO_SESSION', cookies: data.umsCookies }, '*');
            }
            if (data.turnstileToken) {
                window.postMessage({ type: 'UMSY_TURNSTILE_TOKEN', token: data.turnstileToken }, '*');
            }
        });

        // Listen for requests from UMSY website
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UMSY_REQUEST_SESSION') {
                chrome.storage.local.get(['umsCookies', 'turnstileToken'], (data) => {
                    window.postMessage({
                        type: 'UMSY_RESPONSE_SESSION',
                        cookies: data.umsCookies || null,
                        token: data.turnstileToken || null
                    }, '*');
                });
            }
        });
    }
})();
