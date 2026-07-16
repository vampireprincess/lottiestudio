/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: {
            primary: '#0f0f11',
            secondary: '#18181c',
            tertiary: '#1e1e24',
            panel: '#16161a',
            hover: '#22222a',
            active: '#2a2a35',
            border: '#2e2e3a',
          },
          text: {
            primary: '#f0f0f5',
            secondary: '#9090a8',
            muted: '#5a5a70',
            accent: '#7b68ee',
          },
          accent: {
            primary: '#7b68ee',
            secondary: '#5c4de0',
            glow: '#a08fff',
            danger: '#f04060',
            warning: '#f0a030',
            success: '#30d060',
            info: '#30a0f0',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        'xs': '0.75rem',
        'sm': '0.8125rem',
        'base': '0.875rem',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'panel': '0 2px 16px rgba(0,0,0,0.4)',
        'popup': '0 8px 32px rgba(0,0,0,0.6)',
        'glow-sm': '0 0 8px rgba(123,104,238,0.3)',
        'glow': '0 0 16px rgba(123,104,238,0.4)',
        'glow-lg': '0 0 32px rgba(123,104,238,0.5)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
