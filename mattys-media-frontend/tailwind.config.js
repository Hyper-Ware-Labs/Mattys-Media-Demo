/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0020CC',
        foreground: '#FFFFFF',
        primary: '#CCFF00',
        'primary-foreground': '#000000',
        card: '#0A0A0A',
        'card-foreground': '#FFFFFF',
        accent: '#FF00FF',
        border: '#CCFF00',
        muted: '#001580'
      },
      fontFamily: {
        'heading': ['Unbounded', 'sans-serif'],
        'body': ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
