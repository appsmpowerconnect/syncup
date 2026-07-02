/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#dae2ff',
          300: '#bdcbff',
          400: '#94abff',
          500: '#6080ff',
          600: '#3c56f5',
          700: '#2c3edb',
          800: '#2533b3',
          900: '#232f8f',
          950: '#151a54',
        }
      }
    },
  },
  plugins: [],
}
