/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        success: '#16a34a',
        failure: '#dc2626',
        neutral: '#64748b',
        brand: {
          bg: '#020617',
          card: '#0B1220',
          border: '#1E293B',
          accent: '#7C5CFF',
          accent2: '#4F46E5',
        },
      },
    },
  },
  plugins: [],
};
