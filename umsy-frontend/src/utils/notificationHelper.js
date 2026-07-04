/**
 * Unified notification helper that supports Android bridge and Web Notification API
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
export const sendNotification = (title, body) => {
    // 🔥 Android App Bridge
    if (window.Android && window.Android.triggerNotification) {
        console.log('🤖 Sending Android notification:', title);
        window.Android.triggerNotification(title, body);
        return true;
    }

    // 🌐 Web Browser Fallback
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            tag: 'class-reminder',
            renotify: true
        });
        return true;
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, {
                    body: body,
                    tag: 'class-reminder',
                    renotify: true
                });
            }
        });
    }
    
    return false;
};
