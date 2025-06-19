/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Apple Design System Colors
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Apple-style semantic colors
        apple: {
          blue: "#007AFF",
          green: "#34C759",
          indigo: "#5856D6",
          orange: "#FF9500",
          pink: "#FF2D92",
          purple: "#AF52DE",
          red: "#FF3B30",
          teal: "#5AC8FA",
          yellow: "#FFCC00",
        },
        // 添加HTML中使用的颜色类名
        "apple-blue": "#007AFF",
        "apple-green": "#34C759",
        "apple-indigo": "#5856D6",
        "apple-orange": "#FF9500",
        "apple-pink": "#FF2D92",
        "apple-purple": "#AF52DE",
        "apple-red": "#FF3B30",
        "apple-teal": "#5AC8FA",
        "apple-yellow": "#FFCC00",
        // Dark mode colors
        "dark-bg": "#000000",
        "dark-surface": "#1c1c1e",
        "dark-elevated": "#2c2c2e",
        "dark-text": "#ffffff",
        "dark-secondary": "#8e8e93",
        // Light mode colors
        "light-bg": "#ffffff",
        "light-surface": "#f2f2f7",
        "light-elevated": "#ffffff",
        "light-text": "#000000",
        "light-secondary": "#8e8e93",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        scale: "scale 0.2s ease-out",
        up: "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scale: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
