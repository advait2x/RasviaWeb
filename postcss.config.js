// Tailwind v4’s `@tailwindcss/postcss` already handles vendor prefixes; a
// separate `autoprefixer` pass was triggering PostCSS’s “did not pass `from`”
// warning in Vite 8 without adding value here.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
