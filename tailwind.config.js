/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          900: "#111827",
          800: "#1f2937",
          700: "#374151",
        },
        green: {
          400: "#34d399",
          600: "#16a34a",
          700: "#15803d",
        },
        blue: {
          600: "#2563eb",
          700: "#1d4ed8",
        },
        red: {
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
