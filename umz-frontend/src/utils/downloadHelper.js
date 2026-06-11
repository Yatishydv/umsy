/**
 * Helper utility to handle file downloads in both web browsers and Android WebView
 * @param {Blob} blob - The file content as a Blob
 * @param {string} filename - The name of the file to save
 */
export const downloadFile = (blob, filename) => {
    // 🔥 Android App Bridge Support
    if (window.Android && window.Android.saveBase64File) {
        console.log('🤖 Android bridge detected, sending base64 file:', filename);
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            window.Android.saveBase64File(base64, filename);
        };
        reader.readAsDataURL(blob);
    } else {
        // 🌐 WebView / Browser Hybrid Fallback
        // Using a two-step server-side proxy to avoid blob: URL issues in Android WebView
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result.split(',')[1];
            const apiBase = import.meta.env.VITE_API_BASE_URL || 
                (window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\./) 
                    ? `http://${window.location.hostname}:3001/api` 
                    : 'https://umz-backend-ot1y.onrender.com/api');
            const cleanApiBase = apiBase.replace(/\/$/, '');
            
            try {
                // Step 1: Prepare the download on the server
                const response = await fetch(`${cleanApiBase}/download-prepare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64, filename, contentType: blob.type })
                });
                
                const data = await response.json();
                
                if (data.success && data.downloadId) {
                    // Step 2: Redirect to the real HTTP URL (Android WebViews handle this perfectly)
                    // We append the filename to the URL to help Android DownloadManager recognize the file type
                    window.location.href = `${cleanApiBase}/download-file/${data.downloadId}/${encodeURIComponent(filename)}`;
                } else {
                    throw new Error('Server preparation failed');
                }
            } catch (err) {
                console.warn('⚠️ Download proxy failed, falling back to standard blob download:', err);
                
                // 🌐 Standard Web Download Fallback
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }
        };
        reader.readAsDataURL(blob);
    }
};
