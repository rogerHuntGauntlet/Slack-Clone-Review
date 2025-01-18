/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'fade-in-out': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '20%': { opacity: '1', transform: 'translateY(0)' },
          '80%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        'slide-back-forth': {
          '0%': { transform: 'translateX(0%)' },
          '45%': { transform: 'translateX(100%)' },
          '50%': { transform: 'translateX(100%) scaleX(-1)' },
          '95%': { transform: 'translateX(0%) scaleX(-1)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
      animation: {
        'fade-in-out': 'fade-in-out 2s ease-in-out forwards',
        'slide-back-forth': 'slide-back-forth 10s infinite linear',
      },
      scrollbar: ['rounded'],
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  corePlugins: {
    scrollbar: false
  }
} 