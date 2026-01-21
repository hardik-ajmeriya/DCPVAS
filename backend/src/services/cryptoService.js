import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Derive a 32-byte key from SECRET_KEY; fallback for dev to avoid crashes
const SECRET = process.env.SECRET_KEY || "dcpvas-dev-secret";
const KEY = crypto.createHash("sha256").update(String(SECRET)).digest();
const IV = Buffer.alloc(16, 0);

export function encrypt(text) {
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
