import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_PREFIX = "enc:v1:";
// Derive a 32-byte key from a single secret; prefer ENCRYPTION_KEY but allow SECRET_KEY for backward compatibility.
const SECRET = process.env.ENCRYPTION_KEY || process.env.SECRET_KEY || "dcpvas-dev-secret";
const KEY = crypto.createHash("sha256").update(String(SECRET)).digest();
const IV = Buffer.alloc(16, 0);

console.log("[cryptoService] Initialized symmetric crypto", {
  hasSecretKeyEnv: Boolean(process.env.SECRET_KEY),
});

export function encrypt(text) {
  try {
    const plainText = String(text ?? "");
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (err) {
    console.error("[cryptoService] Encryption failed:", err?.message || err);
    throw err;
  }
}

export function decrypt(encrypted) {
  try {
    const input = String(encrypted ?? "");
    if (!input) return "";

    // Backward compatibility:
    // 1) New format uses an explicit prefix.
    // 2) Legacy format stored raw hex without prefix.
    // 3) Some historic data may have plaintext tokens.
    if (!input.startsWith(ENCRYPTION_PREFIX)) {
      const looksLikeLegacyHex = /^[0-9a-f]+$/i.test(input) && input.length % 2 === 0;
      if (!looksLikeLegacyHex) {
        return input;
      }

      try {
        const legacyDecipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
        let legacy = legacyDecipher.update(input, "hex", "utf8");
        legacy += legacyDecipher.final("utf8");
        return legacy;
      } catch {
        return input;
      }
    }

    const cipherText = input.slice(ENCRYPTION_PREFIX.length);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[cryptoService] Decryption failed:", err?.message || err);
    throw err;
  }
}
