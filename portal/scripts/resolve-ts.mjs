// Lets the Node test runner load the portal's TypeScript data modules: resolves
// `@/…` like tsconfig's paths, and adds the extension to extensionless imports.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";

const root = new URL("../", import.meta.url);
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const fromPortal = context.parentURL?.startsWith(root.href) && !context.parentURL.includes("/node_modules/");
    const base = specifier.startsWith("@/")
      ? new URL(specifier.slice(2), root)
      : fromPortal && /^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)
        ? new URL(specifier, context.parentURL)
        : null;
    const found = base && EXTENSIONS.map((ext) => new URL(base.href + ext)).find((url) => existsSync(url));
    return nextResolve(found ? found.href : specifier, context);
  },
});
