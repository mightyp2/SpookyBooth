/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        halloween: ['"Fredoka One"', 'cursive']
      }
    }
  },
  plugins: []
};
