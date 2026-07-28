/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          slate: '#0F172A',
          anthracite: '#1E293B',
          terracotta: '#EA580C',
          copper: '#D97706',
          amber: '#F59E0B',
          emerald: '#16A34A',
          lightBg: '#F8FAFC',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        heading: ['var(--font-barlow)', 'Barlow', 'sans-serif'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 20px 40px -15px rgba(15, 23, 42, 0.08)',
        accent: '0 10px 25px -5px rgba(234, 88, 12, 0.3)',
      },
    },
  },
  plugins: [],
};
