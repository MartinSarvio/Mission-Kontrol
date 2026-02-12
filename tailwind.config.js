/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#f5f5f7',
          text: '#1d1d1f',
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
          gray: {
            50: '#f5f5f7',
            100: '#e8e8ed',
            200: '#d2d2d7',
            300: '#aeaeb2',
            400: '#8e8e93',
            500: '#636366',
            600: '#48484a',
            700: '#3a3a3c',
            800: '#2c2c2e',
            900: '#1c1c1e',
          }
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'glass': '0 8px 32px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'card': '16px',
      }
    },
  },
  plugins: [],
}
