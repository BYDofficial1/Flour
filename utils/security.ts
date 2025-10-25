// Helper functions for WebAuthn which uses ArrayBuffers that need to be transmitted.
const bufferToBase64Url = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

const base64UrlToBuffer = (base64Url: string): ArrayBuffer => {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
};

// --- PIN Security ---
export const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToBase64Url(hashBuffer);
};

export const verifyPin = async (pin: string, storedHash: string): Promise<boolean> => {
    if (!pin || !storedHash) return false;
    const newHash = await hashPin(pin);
    return newHash === storedHash;
};


// --- WebAuthn (Biometric) Security ---
// These values are simplified for this offline-first, single-user application.
// In a real multi-user web application, challenge and user IDs should be
// dynamically generated and managed by a secure server.
const CHALLENGE = 'fixed_challenge_for_this_offline_app_12345'; 
const RP_ID = window.location.hostname;
const USER_ID = 'fixed_user_id_for_chakki_app';
const USER_NAME = 'user@chakki.app';
const USER_DISPLAY_NAME = 'Chakki Owner';

export const isWebAuthnSupported = (): boolean => {
    return !!(navigator.credentials && navigator.credentials.create && window.PublicKeyCredential);
};

export const registerBiometric = async (): Promise<string | null> => {
    if (!isWebAuthnSupported()) {
        console.error("WebAuthn is not supported on this browser.");
        return null;
    }

    try {
        const encoder = new TextEncoder();
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: encoder.encode(CHALLENGE),
                rp: { name: "Atta Chakki Hisab", id: RP_ID },
                user: {
                    id: encoder.encode(USER_ID),
                    name: USER_NAME,
                    displayName: USER_DISPLAY_NAME,
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256 algorithm
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // e.g., Touch ID, Face ID, Windows Hello
                    userVerification: "required",
                    requireResidentKey: false,
                },
                timeout: 60000,
            },
        });

        if (credential && (credential as any).rawId) {
            // Return the raw ID as a base64url string to be stored
            return bufferToBase64Url((credential as any).rawId);
        }
        return null;
    } catch (err) {
        console.error("Biometric registration failed:", err);
        return null;
    }
};

export const verifyBiometric = async (credentialId: string): Promise<boolean> => {
     if (!isWebAuthnSupported()) return false;
    
    try {
        const encoder = new TextEncoder();
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: encoder.encode(CHALLENGE),
                allowCredentials: [{
                    type: 'public-key',
                    id: base64UrlToBuffer(credentialId),
                }],
                userVerification: "required",
                rpId: RP_ID,
            },
        });

        // If the call succeeds, verification is successful.
        return !!assertion;
    } catch (err) {
        console.error("Biometric verification failed:", err);
        return false;
    }
};
