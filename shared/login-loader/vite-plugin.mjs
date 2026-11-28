import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** One look for every loading screen: the website's stylesheet is the source */
const CSS_FILE = path.resolve(here, "../../apps/web/app/styles/loader.css");
const RUNTIME_FILE = path.resolve(here, "runtime.js");

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n");

/**
 * Inlines the sign-in loader (styles + runtime.js) into a panel's index.html, so it can paint before the
 * panel's JavaScript downloads. The runtime goes first in <body>, so it can mount straight away.
 */
export default function loginLoader() {
  return {
    name: "hexpertify-login-loader",
    transformIndexHtml() {
      return [
        { tag: "style", attrs: { id: "hx-loader-css" }, children: stripComments(fs.readFileSync(CSS_FILE, "utf8")), injectTo: "head" },
        { tag: "script", children: fs.readFileSync(RUNTIME_FILE, "utf8"), injectTo: "body-prepend" },
      ];
    },
  };
}
