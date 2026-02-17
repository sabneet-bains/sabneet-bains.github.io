# Deployment Checklist (Release Candidate)

## 0) GitHub Pages mode (No Jekyll)

- Commit a root `.nojekyll` file so underscore-prefixed assets (for example `styles/components/_archive.css`) are served as static files.
- If hosting on `github.io`, note that `_headers` is not applied by GitHub Pages. Keep `_headers` for compatible hosts/CDNs, but enforce critical policy through HTML meta tags and/or an external edge proxy.
- Enable Pages deployment from GitHub Actions (`.github/workflows/deploy-pages.yml`).

## 1) Security headers

Set these headers at CDN/hosting edge:

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

## 2) Caching policy

- `index.html`, `archive.html`: `Cache-Control: no-cache`
- `styles/*`, `js/*.js`, SVG assets: `Cache-Control: public, max-age=31536000, immutable` (with hashed filenames for production)
- `assets/*.mp4`: `Cache-Control: public, max-age=31536000, immutable`
- `assets/resume.pdf`: `Cache-Control: public, max-age=86400`

Note: if both `/assets/*` and `/assets/resume.pdf` rules exist, ensure the specific `resume.pdf` rule has higher precedence (or appears later) so it overrides the wildcard policy.

## 3) Compression

- Enable Brotli and gzip for text assets (`.html`, `.css`, `.js`, `.svg`).
- Keep MP4 as-is (already compressed media).

## 4) Media delivery

- Ensure byte-range requests are enabled for MP4 (`Accept-Ranges: bytes`).
- Prefer CDN delivery for `assets/*.mp4`.

## 5) Build/release checks

Run before deploy:

```bash
npm run optimize:resume
npm run optimize:videos
npm run lint
npm run test:a11y
npm run test:perf
```

## 6) Post-deploy smoke test

- Verify `Home` and `Selected` anchor jumps land correctly under sticky nav.
- Verify card hover video play/pause and first-frame thumbnail behavior.
- Verify modal open/close timing and focus trap (`Tab`, `Shift+Tab`, `Esc`).
- Verify Resume nav opens resume modal and download link works.

