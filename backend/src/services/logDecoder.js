// Decode Jenkins console logs that may include hidden annotations and transport encodings.
// Goals:
// - Strip Jenkins ConsoleNote sequences (often visible as "\x1B[8mha:////...\x1B[0m")
// - Remove leftover "ha:////<base64>" artifacts if ESC wrappers are missing
// - If the entire payload looks base64 and gunzip, decode and decompress
// - Normalize to UTF-8 text with LF newlines

import zlib from 'zlib';

function looksLikeBase64(str) {
  if (!str) return false;
  const s = String(str).trim();
  if (s.length < 24) return false;
  // heuristic: only base64 chars and possibly padding, plus length multiple of 4
  if (!/^[A-Za-z0-9+/=\n\r]+$/.test(s)) return false;
  return s.replace(/\s+/g, '').length % 4 === 0;
}

function tryBase64Decode(input) {
  try {
    const buf = Buffer.from(String(input).replace(/\s+/g, ''), 'base64');
    return buf;
  } catch {
    return null;
  }
}

function tryGunzip(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return null;
  // gzip magic number: 1F 8B
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    try {
      return zlib.gunzipSync(buffer);
    } catch {
      return null;
    }
  }
  return null;
}

export function decodeJenkinsConsole(raw) {
  if (!raw) return '';
  let text = String(raw);

  // Strip Jenkins hidden annotation blocks (ConsoleNote) written as ESC[8m ... ESC[0m
  try {
    text = text.replace(/\x1B\[8m[\s\S]*?\x1B\[0m/g, '');
  } catch {}

  // Remove any leftover "ha:////<base64>" sequences even if ESC wrappers are absent
  // These are metadata and not part of human-readable logs
  text = text.replace(/ha:\/{3,}[A-Za-z0-9+/=]+/g, '');

  // If the entire payload looks like base64, attempt to decode; if gzip, decompress
  const trimmed = text.trim();
  if (looksLikeBase64(trimmed)) {
    const b64 = tryBase64Decode(trimmed);
    if (b64) {
      const gunzipped = tryGunzip(b64);
      if (gunzipped) {
        text = gunzipped.toString('utf8');
      } else {
        // Fallback: treat base64-decoded buffer as UTF-8
        try {
          text = b64.toString('utf8');
        } catch {}
      }
    }
  }

  // Normalize CRLF to LF and ensure it's valid UTF-8 string
  try {
    text = text.replace(/\r\n/g, '\n');
  } catch {}
  return text;
}

export default { decodeJenkinsConsole };