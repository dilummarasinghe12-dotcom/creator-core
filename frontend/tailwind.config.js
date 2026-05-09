/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#08080F',
        surface: '#0F0F1A',
        surface2: '#161626',
        accent: '#FF6D00',
        'accent-hover': '#E86200',
        cream: '#F0EBE0',
        muted: '#9B9BAA',
        border: '#1E1E30',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
