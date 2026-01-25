import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

// tailwind.config.js
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.jsx",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta estilo Pulsia / logo
        brand: {
          50:  "#fff8e6",
          100: "#ffefc2",
          200: "#ffe08a",
          300: "#ffd14d",
          400: "#ffc21a",
          500: "#f8c000", // amarillo principal (logo)
          600: "#e0ab00",
          700: "#b38600",
          800: "#7a5c00",
          900: "#3d2e00",
        },
        ink: {
          50:  "#f5f6f7",
          100: "#e6e8eb",
          200: "#cfd4da",
          300: "#a9b1bd",
          400: "#6b7280",
          500: "#374151",
          600: "#1f2937",
          700: "#111827",
          800: "#0b0f17",
          900: "#070a10",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.08)",
      },
    },
  },
    plugins: [forms],
};
