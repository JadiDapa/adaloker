import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma client is generated code, not ours to lint.
    "generated/**",
    // Vendored skill docs/templates (from `npx skills add`), not app code.
    ".agents/**",
    // Standalone Node script (not React) — the react-hooks rule misfires on
    // Baileys' `useMultiFileAuthState` because of its "use..." name.
    "whatsapp-bot/**",
  ]),
]);

export default eslintConfig;
