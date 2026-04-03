import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0A0A0A",
        accent: "#7C3AED",
        violet: "#C084FC",
        cream: "#FAFAF8",
        card: "#141414",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
