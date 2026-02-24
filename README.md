# Sabneet Bains Portfolio

Static GitHub Pages portfolio with selected research projects, an archive view, and accessibility/performance quality checks.

## Local Development

Requirements:
- Node.js LTS (includes npm)

Install dependencies:

```bash
npm install
```

Start local server:

```bash
npm run serve
```

Run quality checks:

```bash
npm run quality
```

## Quality Commands

- `npm run lint`: ESLint + Stylelint + html-validate
- `npm run test:a11y`: Pa11y CI against `index.html` and `archive.html`
- `npm run test:perf`: Lighthouse CI audit (Edge/Chrome via `CHROME_PATH` when available)

## Deployment

GitHub Actions deploys static files from this repository to GitHub Pages.

- Workflow: `.github/workflows/deploy-pages.yml`
- Deployment notes: `docs/DEPLOYMENT.md`

## Project Structure

- `index.html`: main portfolio page
- `archive.html`: filterable research archive
- `styles/`: tokens, base rules, component styles
- `js/`: modal, media preview, and archive interaction logic
- `assets/`: media, resume, and icons
- `data/archive.json`: structured archive export
- `scripts/`: optimization and test runner scripts
