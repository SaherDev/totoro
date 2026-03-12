const preset = require('../../libs/ui/tailwind.preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../libs/ui/src/**/*.{ts,tsx}',
  ],
  plugins: [require('tailwindcss-animate')],
};
