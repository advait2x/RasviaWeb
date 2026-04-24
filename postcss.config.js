// ESM: import the PostCSS plugin as a factory; object-shorthand { tailwindcss } can break resolution.
import tailwindcss from "@tailwindcss/postcss";

export default {
  plugins: [tailwindcss()],
};
