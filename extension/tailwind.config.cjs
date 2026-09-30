module.exports = {
  darkMode: 'class',
  content: ['./popup.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        foreground: 'var(--fg)', subtle: 'var(--muted)', card: 'var(--card)',
        soft: 'var(--soft)', line: 'var(--line)', 'hover-line': 'var(--line-hover)',
        'accent-ink': 'var(--accent-ink)', 'accent-soft': 'var(--accent-soft)',
        'accent-border': 'var(--accent-border)', track: 'var(--track)',
        progress: 'var(--progress)', 'success-soft': 'var(--success-soft)',
        'success-line': 'var(--success-line)', 'success-icon': 'var(--success-icon)',
        'error-soft': 'var(--error-soft)', 'error-line': 'var(--error-line)',
        'error-icon': 'var(--error-icon)', mint: '#bce58d',
      },
      boxShadow: { card: 'var(--card-shadow)' },
    },
  },
  plugins: [],
};
