// Jenkins console logs may contain ANSI escape codes and hyperlink metadata.
// These are cleaned on the backend for readability and analysis.

// Remove ANSI color codes, Jenkins hyperlink escape sequences, and control chars.
// Preserve meaningful log text and normalize line endings.
export function cleanJenkinsLogs(rawLogs) {
  if (!rawLogs) return '';
  let text = String(rawLogs);

  // Remove Jenkins hyperlink/console note blocks like: \x1B[8mha:////...\x1B[0m
  try {
    text = text.replace(/\x1B\[8m[\s\S]*?\x1B\[0m/g, '');
  } catch {}

  // Remove generic ANSI color/style codes (CSI sequences)
  text = text.replace(/\x1B\[[0-9;]*m/g, '');

  // Remove OSC sequences (Operating System Command), terminated by BEL or ESC \\
  text = text.replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)/g, '');

  // Remove other escape/control sequences conservatively
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, ''); // keep \n (0x0A) and \r (0x0D)

  // Normalize CRLF to LF
  text = text.replace(/\r\n/g, '\n');

  // Trim trailing whitespace per line
  text = text
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n');

  return text;
}

export default { cleanJenkinsLogs };