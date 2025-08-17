/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./main.js",
    "./shared.js",
    "./components/**/*.js",
    "./services/**/*.js",
    "./utils/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--bg)',
        'app-panel': 'var(--panel)',
        'app-card': 'var(--card)',
        'app-text': 'var(--text)',
        'app-muted': 'var(--muted)',
        'app-accent': 'var(--accent)',
        'app-success': 'var(--success)',
        'app-danger': 'var(--danger)',
        'app-error': 'var(--error)',
        'app-warning': 'var(--warning)',
        'app-outline': 'var(--outline)',
        'app-border': 'var(--border)',
      }
    },
  },
  plugins: [],
}