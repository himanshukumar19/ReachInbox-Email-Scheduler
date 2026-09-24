/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--color-page)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        primary: "var(--color-text-primary)",
        muted: "var(--color-text-muted)",
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        badge: {
          "pending-bg": "var(--color-badge-pending-bg)",
          "pending-text": "var(--color-badge-pending-text)",
          "sent-bg": "var(--color-badge-sent-bg)",
          "sent-text": "var(--color-badge-sent-text)",
          "failed-bg": "var(--color-badge-failed-bg)",
          "failed-text": "var(--color-badge-failed-text)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        lg: "12px",
        xl: "16px",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};
