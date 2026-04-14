/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FEFCF9', 100: '#F8F4EF', 200: '#EDE8E0', 300: '#DDD5C8', 400: '#C9BBAA' },
        earth: { 100: '#F0E6D8', 200: '#DFC4A4', 300: '#C4956A', 400: '#A97240', 500: '#8B5E3C', 600: '#6B4423', 700: '#4A2C17' },
        forest: { 100: '#D4E4DF', 200: '#A3C5BC', 300: '#6A9E92', 400: '#3D7269', 500: '#2D4A3E', 600: '#1E3329', 700: '#111E18' },
        gold: { 100: '#F5EDD4', 200: '#E8D49A', 300: '#D4B96A', 400: '#C9A84C', 500: '#B8941F', 600: '#8A6E16' },
        coffee: { 50: '#F5EFE8', 100: '#E8D9C8', 200: '#C9A888', 300: '#A87755', 400: '#7A4E2D', 500: '#4A2C17', 600: '#2E1A0E' },
        charcoal: { 100: '#E8E8E8', 200: '#C8C8C8', 300: '#A0A0A0', 400: '#707070', 500: '#404040', 600: '#2A2A2A', 700: '#1A1A1A' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}

