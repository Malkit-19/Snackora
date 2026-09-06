/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {

        snack: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Amber signature
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03', // Rich cocoa
        },
        brand: {
          primary: '#d97706',
          secondary: '#78350f',
          dark: '#1e1b18',
          light: '#fdfbf7',
          surface: '#ffffff',
          accent: '#10b981',
          b2b: '#4338ca' // Indigo for B2B portal distinction
        }
      }
    },
  },
  plugins: [],
}
