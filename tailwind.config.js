/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./tools/template.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0f14',
        surface1: '#151921',
        surface2: '#1d222d',
        border: '#2c3240',
        text: '#f1f2f6',
        muted: '#98a0b3',
        accent: '#f2b632',
        accentDark: '#3a2d0c',
        success: '#34c26b',
        error: '#e0574f',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
