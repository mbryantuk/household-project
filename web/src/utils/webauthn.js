import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import axios from 'axios';

const API_URL = `${window.location.origin}/api/auth/webauthn`;

export async function registerPasskey() {
    try {
        // 1. Get options from server
        const token = localStorage.getItem('token');
        const optionsRes = await axios.get(`${API_URL}/register-options`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const options = optionsRes.data;

        // 2. Start registration in browser
        const attestationResponse = await startRegistration(options);

        // 3. Verify with server
        const verifyRes = await axios.post(`${API_URL}/register-verify`, attestationResponse, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return verifyRes.data;
    } catch (err) {
        console.error("Passkey registration failed:", err);
        throw err;
    }
}

export async function loginWithPasskey(email, rememberMe = false) {
    try {
        // 1. Get options from server
        const optionsRes = await axios.post(`${API_URL}/login-options`, { email });
        const options = optionsRes.data;

        // 2. Start authentication in browser
        const assertionResponse = await startAuthentication(options);

        // 3. Verify with server
        const verifyRes = await axios.post(`${API_URL}/login-verify`, {
            email,
            rememberMe,
            body: assertionResponse
        });

        return verifyRes.data;
    } catch (err) {
        console.error("Passkey login failed:", err);
        throw err;
    }
}
