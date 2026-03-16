/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        board: {
          bg: '#1e3a5f',
          cell: '#0f2744',
          border: '#2d5a8e',
        },
        p1: {
          DEFAULT: '#ef4444',
          glow: '#f87171',
          dark: '#dc2626',
        },
        p2: {
          DEFAULT: '#facc15',
          glow: '#fde047',
          dark: '#eab308',
        },
      },
      animation: {
        'drop-in': 'dropIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-win': 'pulseWin 0.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        dropIn: {
          '0%': { transform: 'translateY(-200%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseWin: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 10px currentColor' },
          '50%': { transform: 'scale(1.15)', boxShadow: '0 0 25px currentColor' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'p1': '0 0 15px rgba(239, 68, 68, 0.7)',
        'p1-lg': '0 0 30px rgba(239, 68, 68, 0.9)',
        'p2': '0 0 15px rgba(250, 204, 21, 0.7)',
        'p2-lg': '0 0 30px rgba(250, 204, 21, 0.9)',
        'board': '0 25px 50px rgba(0, 0, 0, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
