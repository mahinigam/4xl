/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        platinum: {
          DEFAULT: '#D8DCE0',
          light: '#E2E5E8',
          lighter: '#F0F2F4',
          surface: '#FFFFFF',
        },
        graphite: {
          DEFAULT: '#7B828A',
          dark: '#3A4048',
          deep: '#5B6168',
          border: '#4F555C',
        },
        mac: {
          accent: '#385A94',
          alert: '#B23A3A',
          desktop: '#6E716C',
        },
      },
      fontFamily: {
        ui: ['Work Sans', 'sans-serif'],
        code: ['VT323', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
