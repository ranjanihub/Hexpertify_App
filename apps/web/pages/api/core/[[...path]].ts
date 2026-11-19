import type { NextApiRequest, NextApiResponse } from "next";
import apiApp from "@backend/app";

/**
 * The Hexpertify REST API, served by this website (monolith). next.config.ts rewrites every /api/* path
 * except NextAuth's own (/api/auth/session, /csrf, /signin, ...) to /api/core/*; this handler restores the
 * original /api/* URL and hands the request to the Express app in server/src/app.ts.
 */
export const config = {
  api: {
    // Express parses the body itself (payment webhooks need the raw bytes for signature checks)
    bodyParser: false,
    // Express sends the response; Next must not warn that the handler resolved without one
    externalResolver: true,
    responseLimit: false,
  },
  maxDuration: 60,
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = req.url || "/api";
  const [pathname, ...rest] = url.split("?");
  const search = rest.length ? `?${rest.join("?")}` : "";
  // /api/core/<path> → /api/<path> (a direct /api/... URL is left as it is)
  const apiPath = pathname.replace(/^\/api\/core(?=\/|$)/, "/api") || "/api";
  req.url = `${apiPath}${search}`;

  // Next decorates req/res with its own helpers (res.redirect = 307, res.json/send/status, a parsed req.query
  // that includes the catch-all `path`). Remove them so Express's own request/response methods apply.
  for (const key of ["query", "body", "cookies", "preview", "previewData", "draftMode"]) delete (req as any)[key];
  for (const key of ["status", "json", "send", "redirect", "revalidate", "setDraftMode", "setPreviewData", "clearPreviewData"]) {
    delete (res as any)[key];
  }

  return new Promise<void>((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    (apiApp as unknown as (req: NextApiRequest, res: NextApiResponse, next: (err?: unknown) => void) => void)(
      req,
      res,
      (err?: unknown) => {
        // Nothing in the API matched
        if (!res.headersSent) {
          res.status(err ? 500 : 404).json({ success: false, error: err ? "Internal Server Error" : `No API route for ${req.method} ${apiPath}` });
        }
        resolve();
      },
    );
  });
}
