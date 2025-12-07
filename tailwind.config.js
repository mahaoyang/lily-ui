// tailwind.config.ts
var config = {
  content: [
    "./public/**/*.{html,js}",
    "./src/**/*.{html,js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        transparent: "transparent",
        current: "currentColor",
        black: "#000",
        white: "#fff",
        gray: {
          1: "var(--gray-1)",
          2: "var(--gray-2)",
          3: "var(--gray-3)",
          4: "var(--gray-4)",
          5: "var(--gray-5)",
          6: "var(--gray-6)",
          7: "var(--gray-7)",
          8: "var(--gray-8)",
          9: "var(--gray-9)",
          10: "var(--gray-10)",
          11: "var(--gray-11)",
          12: "var(--gray-12)",
          a1: "var(--gray-a1)",
          a2: "var(--gray-a2)",
          a3: "var(--gray-a3)",
          a4: "var(--gray-a4)",
          a5: "var(--gray-a5)",
          a6: "var(--gray-a6)",
          a7: "var(--gray-a7)",
          a8: "var(--gray-a8)",
          a9: "var(--gray-a9)",
          a10: "var(--gray-a10)",
          a11: "var(--gray-a11)",
          a12: "var(--gray-a12)"
        },
        accent: {
          1: "var(--accent-1)",
          2: "var(--accent-2)",
          3: "var(--accent-3)",
          4: "var(--accent-4)",
          5: "var(--accent-5)",
          6: "var(--accent-6)",
          7: "var(--accent-7)",
          8: "var(--accent-8)",
          9: "var(--accent-9)",
          10: "var(--accent-10)",
          11: "var(--accent-11)",
          12: "var(--accent-12)",
          a1: "var(--accent-a1)",
          a2: "var(--accent-a2)",
          a3: "var(--accent-a3)",
          a4: "var(--accent-a4)",
          a5: "var(--accent-a5)",
          a6: "var(--accent-a6)",
          a7: "var(--accent-a7)",
          a8: "var(--accent-a8)",
          a9: "var(--accent-a9)",
          a10: "var(--accent-a10)",
          a11: "var(--accent-a11)",
          a12: "var(--accent-a12)",
          contrast: "var(--accent-contrast)",
          surface: "var(--accent-surface)",
          indicator: "var(--accent-indicator)",
          track: "var(--accent-track)"
        }
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
        9: "var(--space-9)"
      },
      fontSize: {
        1: ["var(--font-size-1)", { lineHeight: "var(--line-height-1)", letterSpacing: "var(--letter-spacing-1)" }],
        2: ["var(--font-size-2)", { lineHeight: "var(--line-height-2)", letterSpacing: "var(--letter-spacing-2)" }],
        3: ["var(--font-size-3)", { lineHeight: "var(--line-height-3)", letterSpacing: "var(--letter-spacing-3)" }],
        4: ["var(--font-size-4)", { lineHeight: "var(--line-height-4)", letterSpacing: "var(--letter-spacing-4)" }],
        5: ["var(--font-size-5)", { lineHeight: "var(--line-height-5)", letterSpacing: "var(--letter-spacing-5)" }],
        6: ["var(--font-size-6)", { lineHeight: "var(--line-height-6)", letterSpacing: "var(--letter-spacing-6)" }],
        7: ["var(--font-size-7)", { lineHeight: "var(--line-height-7)", letterSpacing: "var(--letter-spacing-7)" }],
        8: ["var(--font-size-8)", { lineHeight: "var(--line-height-8)", letterSpacing: "var(--letter-spacing-8)" }],
        9: ["var(--font-size-9)", { lineHeight: "var(--line-height-9)", letterSpacing: "var(--letter-spacing-9)" }],
        0: ["10px", { lineHeight: "12px", letterSpacing: "0.005em" }],
        "00": ["8px", { lineHeight: "10px", letterSpacing: "0.005em" }],
        "000": ["6px", { lineHeight: "8px", letterSpacing: "0.01em" }]
      },
      lineHeight: {
        1: "var(--line-height-1)",
        2: "var(--line-height-2)",
        3: "var(--line-height-3)",
        4: "var(--line-height-4)",
        5: "var(--line-height-5)",
        6: "var(--line-height-6)",
        7: "var(--line-height-7)",
        8: "var(--line-height-8)",
        9: "var(--line-height-9)"
      },
      letterSpacing: {
        1: "var(--letter-spacing-1)",
        2: "var(--letter-spacing-2)",
        3: "var(--letter-spacing-3)",
        4: "var(--letter-spacing-4)",
        5: "var(--letter-spacing-5)",
        6: "var(--letter-spacing-6)",
        7: "var(--letter-spacing-7)",
        8: "var(--letter-spacing-8)",
        9: "var(--letter-spacing-9)"
      },
      borderRadius: {
        1: "var(--radius-1)",
        2: "var(--radius-2)",
        3: "var(--radius-3)",
        4: "var(--radius-4)",
        5: "var(--radius-5)",
        6: "var(--radius-6)",
        full: "var(--radius-full)",
        thumb: "var(--radius-thumb)"
      },
      fontWeight: {
        light: "var(--font-weight-light)",
        regular: "var(--font-weight-regular)",
        medium: "var(--font-weight-medium)",
        bold: "var(--font-weight-bold)"
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
        4: "var(--shadow-4)",
        5: "var(--shadow-5)",
        6: "var(--shadow-6)"
      },
      fontFamily: {
        sans: "var(--default-font-family)",
        heading: "var(--heading-font-family)",
        mono: "var(--code-font-family)"
      }
    }
  },
  plugins: []
};
var tailwind_config_default = config;
export {
  tailwind_config_default as default
};
