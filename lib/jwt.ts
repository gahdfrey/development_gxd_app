const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error("JWT_SECRET is missing. Add it in .env.local");
}

// Encode string into crypto-safe Uint8Array for jose
export const JWT_SECRET = new TextEncoder().encode(secret);
