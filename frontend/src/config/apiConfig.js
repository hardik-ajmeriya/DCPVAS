// Central API configuration for DCPVAS frontend
// Ensures a single source of truth for backend URLs in all environments.

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  // In production (e.g., Vercel), this must be set in env settings.
  // We log a warning in development to make misconfiguration obvious.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('VITE_API_URL is not set. API calls will fail unless configured.');
  }
}

const normalizeOrigin = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\/+$/u, '');
};

// Origin for the backend, e.g. "https://dcpvas.onrender.com"
export const API_ORIGIN = normalizeOrigin(rawApiUrl || '');

// Base REST API path, e.g. "https://dcpvas.onrender.com/api"
export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '';

// Helper to build full API URLs safely
export const createApiPath = (path = '') => {
  const trimmed = String(path || '').replace(/^\/+/, '');
  return API_BASE ? `${API_BASE}/${trimmed}` : `/${trimmed}`;
};

// Socket base URL; can be overridden separately if needed
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_ORIGIN || undefined;
