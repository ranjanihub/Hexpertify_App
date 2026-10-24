/**
 * The one Hexpertify email layout. Every email the platform sends is built from these blocks.
 *
 * Light by default; mail apps that report the phone's dark theme (Apple Mail, Outlook, Samsung Mail)
 * switch to the dark palette through `prefers-color-scheme`. Apps that ignore the media query
 * (Gmail web, Gmail app) show the light version, which they may auto-invert on their own.
 */

/** Absolute link into the panels: PORTAL_URL, else this Vercel project's domain, else local dev */
export function portalUrl(path: string): string {
  const base = process.env.PORTAL_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5000');
  return `${base.replace(/\/$/, '')}${path}`;
}

/** Images live in Backend/public/email so mail apps can always load them */
export const emailAsset = (file: string) => portalUrl(`/email/${file}`);

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'hexpertifyapp@gmail.com';
export const WEBSITE_URL = (process.env.WEBSITE_URL || 'https://hexpertify.com').replace(/\/$/, '');

/** Escapes user-supplied text (names, notes, titles) before it goes into HTML */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const rupees = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Palette: [light, dark]
const C = {
  page: ['#f4f2fb', '#0b0914'],
  card: ['#ffffff', '#16131f'],
  soft: ['#f7f5fe', '#1e1a2b'],
  border: ['#e6e1f5', '#2c2740'],
  text: ['#1f1a2e', '#f3f1fa'],
  muted: ['#5b5670', '#b9b3cc'],
  accent: ['#532bce', '#a78bfa'],
  brand: '#532bce'
};

export type Tone = 'brand' | 'success' | 'danger' | 'warning';
const TONE: Record<Tone, [string, string]> = {
  brand: ['#532bce', '#a78bfa'],
  success: ['#15803d', '#4ade80'],
  danger: ['#b91c1c', '#f87171'],
  warning: ['#b45309', '#fbbf24']
};

const STYLE = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  a { text-decoration: none; }
  @media (prefers-color-scheme: dark) {
    .bg-page { background: ${C.page[1]} !important; }
    .bg-card { background: ${C.card[1]} !important; }
    .bg-soft { background: ${C.soft[1]} !important; border-color: ${C.border[1]} !important; }
    .bd { border-color: ${C.border[1]} !important; }
    .tx { color: ${C.text[1]} !important; }
    .tx-muted { color: ${C.muted[1]} !important; }
    .tx-accent { color: ${C.accent[1]} !important; }
    .tx-success { color: ${TONE.success[1]} !important; }
    .tx-danger { color: ${TONE.danger[1]} !important; }
    .tx-warning { color: ${TONE.warning[1]} !important; }
    .dot-off { background: #3a3450 !important; }
  }
  [data-ogsc] .tx { color: ${C.text[1]} !important; }
  [data-ogsc] .tx-muted { color: ${C.muted[1]} !important; }
  [data-ogsc] .tx-accent { color: ${C.accent[1]} !important; }
  [data-ogsb] .bg-page { background: ${C.page[1]} !important; }
  [data-ogsb] .bg-card { background: ${C.card[1]} !important; }
  [data-ogsb] .bg-soft { background: ${C.soft[1]} !important; }
  @media only screen and (max-width: 600px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .hide-sm { display: none !important; }
    .h1 { font-size: 24px !important; }
  }
`;

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export interface LayoutOptions {
  /** Shown in the inbox list next to the subject */
  preheader: string;
  headline: string;
  /** Greeting + intro paragraph(s), already escaped */
  intro: string;
  /** 'rocket' | 'namaste' illustration beside the headline */
  illustration?: 'rocket' | 'namaste';
  /** Body blocks (details, buttons, notes) built with the helpers below */
  body?: string[];
  /** Why the recipient got this email, shown in the footer */
  reason: string;
}

export function emailLayout(o: LayoutOptions): string {
  const year = new Date().getFullYear();
  const art = o.illustration
    ? `<td class="hide-sm" width="150" align="right" valign="top" style="padding-left:12px;"><img src="${emailAsset(`${o.illustration}.png`)}" width="140" height="140" alt="" style="display:block;width:140px;height:140px;border:0;"></td>`
    : '';
  const social = (file: string, url: string, alt: string) =>
    `<a href="${url}" target="_blank" style="display:inline-block;margin:0 8px;"><img src="${emailAsset(file)}" width="24" height="24" alt="${alt}" style="display:block;border:0;"></a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${esc(o.headline)}</title>
  <style>${STYLE}</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:${C.page[0]};font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" bgcolor="${C.page[0]}" style="background:${C.page[0]};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="bg-card bd" bgcolor="${C.card[0]}" style="width:100%;max-width:600px;background:${C.card[0]};border:1px solid ${C.border[0]};border-radius:16px;overflow:hidden;">
          <tr>
            <td bgcolor="${C.brand}" style="background:${C.brand};padding:16px 28px;" class="px">
              <a href="${WEBSITE_URL}" target="_blank"><img src="${emailAsset('logo.png')}" width="117" height="42" alt="Hexpertify" style="display:block;border:0;width:117px;height:42px;"></a>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:28px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <h1 class="tx h1" style="margin:0 0 12px;font-size:28px;line-height:1.25;font-weight:800;color:${C.text[0]};">${esc(o.headline)}</h1>
                    <div class="tx-muted" style="font-size:15px;line-height:1.65;color:${C.muted[0]};">${o.intro}</div>
                  </td>
                  ${art}
                </tr>
              </table>
            </td>
          </tr>
          ${(o.body || []).map((b) => `<tr><td class="px" style="padding:12px 28px;">${b}</td></tr>`).join('\n          ')}
          <tr>
            <td class="px" style="padding:20px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-soft" bgcolor="${C.soft[0]}" style="background:${C.soft[0]};border:1px solid ${C.border[0]};border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;" class="tx" ><span class="tx" style="font-size:14px;font-weight:700;color:${C.text[0]};">Need help?</span>
                    <span class="tx-muted" style="font-size:14px;color:${C.muted[0]};"> Reply to this email or write to </span><a href="mailto:${SUPPORT_EMAIL}" class="tx-accent" style="font-size:14px;font-weight:700;color:${C.accent[0]};">${SUPPORT_EMAIL}</a></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" class="px" style="padding:24px 28px 28px;">
              <div style="margin-bottom:14px;">
                ${social('instagram.png', 'https://www.instagram.com/hexpertify', 'Instagram')}
                ${social('linkedin.png', 'https://www.linkedin.com/company/hexpertify/', 'LinkedIn')}
                ${social('youtube.png', 'https://youtube.com/@hexpertify_app', 'YouTube')}
              </div>
              <p class="tx-muted" style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${C.muted[0]};">${esc(o.reason)}</p>
              <p style="margin:0 0 8px;font-size:12px;">
                <a href="${WEBSITE_URL}/terms" target="_blank" class="tx-accent" style="color:${C.accent[0]};">Terms &amp; Conditions</a>
                <span class="tx-muted" style="color:${C.muted[0]};"> | </span>
                <a href="${WEBSITE_URL}/privacy" target="_blank" class="tx-accent" style="color:${C.accent[0]};">Privacy Policy</a>
              </p>
              <p class="tx-muted" style="margin:0;font-size:12px;color:${C.muted[0]};">© ${year} Hexpertify. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain paragraph; `html` must already be escaped */
export function paragraph(html: string): string {
  return `<p class="tx-muted" style="margin:0;font-size:15px;line-height:1.65;color:${C.muted[0]};">${html}</p>`;
}

/** Section heading such as "Session details" */
export function heading(text: string): string {
  return `<h2 class="tx" style="margin:8px 0 0;font-size:18px;font-weight:800;color:${C.text[0]};">${esc(text)}</h2>`;
}

/** Label/value table. Values are escaped unless wrapped with `raw()` */
export type Row = [label: string, value: string | number | RawHtml | undefined | null];
export interface RawHtml { __raw: string }
export const raw = (html: string): RawHtml => ({ __raw: html });

export function details(rows: Row[]): string {
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  const cells = visible.map(([label, value], i) => {
    const border = i < visible.length - 1 ? `border-bottom:1px solid ${C.border[0]};` : '';
    const v = typeof value === 'object' && value && '__raw' in value ? value.__raw : esc(value);
    return `<tr>
      <td class="tx-muted bd" style="padding:11px 18px;font-size:14px;color:${C.muted[0]};${border}">${esc(label)}</td>
      <td class="tx bd" align="right" style="padding:11px 18px;font-size:14px;font-weight:700;color:${C.text[0]};text-align:right;${border}">${v}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-soft" bgcolor="${C.soft[0]}" style="background:${C.soft[0]};border:1px solid ${C.border[0]};border-radius:12px;border-collapse:separate;">${cells}</table>`;
}

/** Coloured text for status values inside `details` */
export function toneText(text: string, tone: Tone): RawHtml {
  return raw(`<span class="tx-${tone === 'brand' ? 'accent' : tone}" style="color:${TONE[tone][0]};">${esc(text)}</span>`);
}

/** Primary call-to-action button */
export function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto;">
    <tr><td bgcolor="${C.brand}" style="background:${C.brand};border-radius:10px;">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;border-radius:10px;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

/** Highlighted note (reason, refund timing, next steps) */
export function callout(html: string, tone: Tone = 'brand'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-soft" bgcolor="${C.soft[0]}" style="background:${C.soft[0]};border:1px solid ${C.border[0]};border-left:4px solid ${TONE[tone][0]};border-radius:10px;">
    <tr><td class="tx" style="padding:14px 18px;font-size:14px;line-height:1.6;color:${C.text[0]};">${html}</td></tr>
  </table>`;
}

/** Expert card: photo, name and a few short lines */
export function personCard(p: { name: string; photoUrl?: string; lines: (string | undefined)[] }): string {
  const photo = p.photoUrl && /^https?:\/\//.test(p.photoUrl)
    ? `<td width="96" valign="top" style="padding-right:16px;"><img src="${esc(p.photoUrl)}" width="96" height="96" alt="${esc(p.name)}" style="display:block;width:96px;height:96px;border-radius:12px;object-fit:cover;border:1px solid ${C.border[0]};"></td>`
    : '';
  const lines = p.lines.filter(Boolean).map((l) => `<div class="tx-muted" style="font-size:14px;line-height:1.6;color:${C.muted[0]};">${esc(l)}</div>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${photo}
    <td valign="top"><div class="tx" style="font-size:16px;font-weight:800;color:${C.text[0]};margin-bottom:4px;">${esc(p.name)}</div>${lines}</td>
  </tr></table>`;
}

/** Booked → Confirmed → Completed progress; `step` is how many are done */
export function statusTracker(step: 1 | 2 | 3, caption: string): string {
  const labels = ['Booked', 'Confirmed', 'Completed'];
  const green = '#16a34a';
  const cells = labels.map((label, i) => {
    const done = i < step;
    return `<td align="center" width="33%" style="padding:4px;">
      <div class="${done ? '' : 'dot-off'}" style="width:14px;height:14px;border-radius:7px;background:${done ? green : '#d4d0e2'};margin:0 auto 6px;line-height:14px;font-size:0;">&nbsp;</div>
      <div class="${done ? 'tx' : 'tx-muted'}" style="font-size:13px;font-weight:${done ? 700 : 500};color:${done ? C.text[0] : C.muted[0]};">${label}</div>
    </td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-soft" bgcolor="${C.soft[0]}" style="background:${C.soft[0]};border:1px solid ${C.border[0]};border-radius:12px;">
    <tr><td style="padding:16px 12px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table></td></tr>
    <tr><td align="center" class="tx-muted" style="padding:6px 18px 16px;font-size:14px;color:${C.muted[0]};">${caption}</td></tr>
  </table>`;
}

/** Plain-text fallback from label/value rows */
export function textRows(rows: Row[]): string {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([l, v]) => `${l}: ${typeof v === 'object' && v && '__raw' in v ? v.__raw.replace(/<[^>]+>/g, '') : v}`)
    .join('\n');
}
