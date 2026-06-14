import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Drop Neue Machina .woff2 files in /public/fonts to use it; until then
        // it falls back to Space Grotesk (closest free geometric display face),
        // then Sora.
        machina: ['"Neue Machina"', '"Space Grotesk"', "Sora", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
