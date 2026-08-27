/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand accent — high-contrast yellow (Wise-style pop on a dark UI).
        // Use dark text on brand-400/500. Change here to re-theme the whole app.
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#ffcc33',
          500: '#ffc400', // primary accent (buttons, selected states)
          600: '#e0a800',
          700: '#b58600',
          800: '#8a6600',
          900: '#5c4400',
        },
        // Dark surfaces — near-black, layered for depth
        ink: {
          DEFAULT: '#0b0c0e', // app background
          soft: '#16181c', // cards
          muted: '#22252b', // inputs / raised chips
          line: '#2a2d33', // hairline borders
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
