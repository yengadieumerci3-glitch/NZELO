/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FCFBF7',
        forest: '#1B4332',
        terracotta: '#C05C3E',
        charcoal: '#2B2D2F',
        stone: '#7A7D81',
        alabaster: '#F0EDE6',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
