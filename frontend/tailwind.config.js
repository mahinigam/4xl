/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0D0D0F',
          light: '#141417',
          lighter: '#1a1a1e',
        },
        navy: {
          DEFAULT: '#1E3A5F',
          accent: '#2A4A73',
          glow: 'rgba(30, 58, 95, 0.15)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
