/**
 * The sign-in loader (shared/login-loader/runtime.js, inlined into index.html by the Vite plugin): the website's
 * loading screen, kept on screen from the login page until the panel has confirmed the session.
 */
declare global {
  interface Window {
    hxLoader?: { start(): void; done(): void };
  }
}

/** Login page, right after a successful sign-in, before leaving for the panel */
export function startLoginLoader() {
  window.hxLoader?.start();
}

/** The panel is ready (or the login page opened): plays the loader out if one is showing */
export function finishLoginLoader() {
  window.hxLoader?.done();
}
