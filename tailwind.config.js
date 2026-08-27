/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand accent — Wise-inspired but neutral-forward. Easy to re-theme.
        brand: {
          50: '#eefdf3',
          100: '#d6f9e2',
          200: '#aff2c8',
          300: '#79e5a6',
          400: '#3fd07f',
          500: '#16b364', // primary accent
          600: '#0a9152',
          700: '#0a7444',
          800: '#0c5c39',
          900: '#0b4b30',
        },
        // Surfaces — high-contrast, Wise-like
        ink: {
          DEFAULT: '#0e0f11',
          soft: '#16181c',
          muted: '#22252b',
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
