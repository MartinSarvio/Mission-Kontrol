/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#0a0a0f',
          text: '#ffffff',
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
          gray: {
            50: '#1c1c1e',
            100: '#2c2c2e',
            200: '#3a3a3c',
            300: '#48484a',
            400: '#636366',
            500: '#8e8e93',
            600: '#aeaeb2',
            700: '#d2d2d7',
            800: '#e8e8ed',
            900: '#f5f5f7',
          }
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.2), 0 0.5px 1px rgba(0,0,0,0.15)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '4px',
        'lg': '6px',
        'xl': '6px',
        '2xl': '8px',
        'card': '6px',
      }
    },
  },
  plugins: [],
}
