/** Tailwind compilado em build (sem o CDN de desenvolvimento). */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)', mat: 'var(--mat)', panel: 'var(--panel)', panel2: 'var(--panel-2)',
        line: 'var(--line)', line2: 'var(--line-2)', fg: 'var(--fg)', fg2: 'var(--fg-2)', muted: 'var(--muted)',
        blood: 'rgb(var(--blood-rgb) / <alpha-value>)', gold: 'rgb(var(--gold-rgb) / <alpha-value>)', win: 'rgb(var(--win-rgb) / <alpha-value>)'
      },
      fontFamily: {
        display: ['Anybody', '"Arial Narrow"', 'Impact', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Martian Mono"', 'ui-monospace', 'monospace']
      },
      screens: { xs: '480px' }
    }
  },
  plugins: []
};
