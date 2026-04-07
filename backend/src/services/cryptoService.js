import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Derive a 32-byte key from a single secret; prefer ENCRYPTION_KEY but allow SECRET_KEY for backward compatibility.
const SECRET = process.env.ENCRYPTION_KEY || process.env.SECRET_KEY || "dcpvas-dev-secret";
const KEY = crypto.createHash("sha256").update(String(SECRET)).digest();
const IV = Buffer.alloc(16, 0);

console.log("[cryptoService] Initialized symmetric crypto", {
  hasSecretKeyEnv: Boolean(process.env.SECRET_KEY),
});

export function encrypt(text) {
  try {
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (err) {
    console.error("[cryptoService] Encryption failed:", err?.message || err);
    throw err;
  }
}

export function decrypt(encrypted) {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[cryptoService] Decryption failed:", err?.message || err);
    throw err;
  }
}
