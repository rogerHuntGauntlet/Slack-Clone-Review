/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      scrollbar: ['rounded'],
      animation: {
        'slide-back-forth': 'slide-back-forth 10s infinite linear',
      },
      keyframes: {
        'slide-back-forth': {
          '0%': { transform: 'translateX(0%)' },
          '45%': { transform: 'translateX(100%)' },
          '50%': { transform: 'translateX(100%) scaleX(-1)' },
          '95%': { transform: 'translateX(0%) scaleX(-1)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  corePlugins: {
    scrollbar: false
  }
} 