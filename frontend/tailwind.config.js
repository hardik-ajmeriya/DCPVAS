/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    'text-green-400', 'text-red-400', 'text-yellow-300', 'text-blue-300', 'text-slate-300',
    'bg-green-500/15', 'bg-red-500/15', 'bg-yellow-500/15', 'bg-blue-500/15', 'bg-white/5',
    'border-green-500/40', 'border-red-500/40', 'border-yellow-500/40', 'border-blue-500/40', 'border-slate-700',
    'bg-green-400', 'bg-red-400', 'bg-yellow-300', 'bg-blue-300', 'bg-slate-600'
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
