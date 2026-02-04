/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0B0E14',
        surface: '#121826',
        primary: '#7C5CFF',
        accent: '#00E5FF',
        text: '#E6E8EB',
        muted: '#9BA3AF',
        border: '#1F2937',
      },
    },
  },
  plugins: [],
};
