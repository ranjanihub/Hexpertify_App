/**
 * Lets slow follow-up work (emails, push, notifications) finish after the response is sent, so people don't
 * wait for mail servers. On Vercel this uses the platform's own `waitUntil` (the request context that the
 * @vercel/functions package reads), which keeps the function alive until the work is done. On a long-running
 * server (local dev, a VM) the process stays up anyway, so the work simply continues in the background.
 *
 * Returns a promise to await BEFORE responding: it resolves at once when the work can safely continue in the
 * background, and only waits for the work itself when it can't (on Vercel without the request context).
 */
export function finishAfterResponse(work: Promise<unknown>): Promise<unknown> {
  const settled = Promise.resolve(work).catch((err) => console.error('[after-response]', err?.message || err));
  const ctx = (globalThis as any)[Symbol.for('@vercel/request-context')]?.get?.();
  if (typeof ctx?.waitUntil === 'function') {
    ctx.waitUntil(settled);
    return Promise.resolve();
  }
  // Serverless without a way to keep running: wait, as before, so nothing is cut off
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return settled;
  return Promise.resolve();
}
