// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Arquitectura limpia / hexagonal: las dependencias apuntan hacia adentro (ver docs/arquitectura.md).
    // Las pruebas (*.test.mjs) quedan fuera: arman piezas de varias capas para probarlas juntas.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/domain",
              from: ["./src/application", "./src/infrastructure", "./src/presentation", "./src/di", "./src/app"],
              message: "El dominio es puro: solo puede depender de sí mismo y de src/shared.",
            },
            {
              target: "./src/application",
              from: ["./src/infrastructure", "./src/presentation", "./src/di", "./src/app"],
              message: "La aplicación solo conoce el dominio y los puertos; los adaptadores se inyectan desde src/di.",
            },
            {
              target: ["./src/presentation", "./src/app"],
              from: "./src/infrastructure",
              message: "La presentación no usa adaptadores directamente: pídelos a src/di (container o demo).",
            },
            {
              target: "./src/infrastructure",
              from: ["./src/presentation", "./src/di", "./src/app"],
              message: "Los adaptadores implementan puertos; no dependen de la interfaz ni de la composición.",
            },
            {
              target: "./src/shared",
              from: ["./src/domain", "./src/application", "./src/infrastructure", "./src/presentation", "./src/di", "./src/app"],
              message: "src/shared es neutral: no depende de ninguna capa.",
            },
          ],
        },
      ],
    },
  },
]);
