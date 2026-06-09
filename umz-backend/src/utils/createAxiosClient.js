import axios from 'axios';
import { DEFAULT_HEADERS } from '../config/constants.js';

/**
 * Creates an Axios client configured with session cookies
 * @param {string} cookieString - Cookie string from authenticated session
 * @returns {import('axios').AxiosInstance} - Configured Axios instance
 */
export function createAxiosClient(cookieString) {
    const client = axios.create({
        headers: {
            ...DEFAULT_HEADERS,
            'Cookie': cookieString
        }
    });

    // Strip Content-Type and X-Requested-With for GET requests to avoid ASP.NET session/lifecycle issues
    client.interceptors.request.use(config => {
        if (config.method?.toLowerCase() === 'get') {
            if (config.headers) {
                delete config.headers['Content-Type'];
                delete config.headers['X-Requested-With'];
            }
        }
        return config;
    }, error => {
        return Promise.reject(error);
    });

    return client;
}
