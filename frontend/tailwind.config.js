/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        blackletter: ['"UnifrakturMaguntia"', 'cursive'],
        serif:       ['"Playfair Display"', 'Georgia', 'serif'],
        fell:        ['"IM Fell English"', 'Georgia', 'serif'],
        caption:     ['"Special Elite"', '"Courier New"', 'monospace'],
      },
      colors: {
        paper:    '#f0e6c8',
        'paper-dark': '#ddd0a8',
        'paper-worn': '#e8d9b4',
        ink:      '#1a1208',
        'ink-faded': '#4a3f2f',
        'ink-light': '#7a6a50',
        'masthead-red': '#8b1a1a',
        rule:     '#2c2016',
        highlight: '#c8a84b',
      },
      boxShadow: {
        clipping: '2px 3px 12px rgba(26, 18, 8, 0.4)',
        lifted:   '4px 6px 20px rgba(26, 18, 8, 0.5)',
      },
      rotate: {
        '0.5': '0.5deg',
        '0.7': '0.7deg',
        '-0.5': '-0.5deg',
        '-0.8': '-0.8deg',
        '1':  '1deg',
        '-1': '-1deg',
      },
    },
  },
  plugins: [],
}
