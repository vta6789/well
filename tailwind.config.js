module.exports = {
  important: ".original-site",
  corePlugins: { preflight: false },
  content: ["./index.html", "./frontend/*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        warm: { 50: "#fffbe1", 100: "#fef3c7", 500: "#f59e0b", 600: "#d97706" },
      },
      fontFamily: { sans: ["Nunito Sans", "Plus Jakarta Sans", "sans-serif"] },
    },
  },
  plugins: [],
};
