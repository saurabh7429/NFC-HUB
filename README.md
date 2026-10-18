# NFC HUB - Business Review & NFC Card Management Platform

Local management platform for independent business micro-sites, canonical QR/NFC routing, and print-ready card studio.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the local Manager API and Admin UI
npm start
# Server listens at http://127.0.0.1:3000/a/
```

- **Admin Dashboard**: `http://127.0.0.1:3000/a/`
- **Business Previews**: `http://127.0.0.1:3000/b/<id>/`

---

## 🧪 Automated Testing

```bash
# Run unit & integration test suites
npm test
```

---

## 📁 Repository Layout

```
.
├── a/                  # Admin UI (Vanilla HTML, CSS, JavaScript)
├── api/                # Local Node.js manager API (Private to 127.0.0.1)
├── b/                  # Independent business micro-sites (/b/<id>/)
├── config/             # Global application configuration
├── s/                  # Starter template copied on new business creation
├── t/                  # Built-in card themes
├── test/               # Automated unit & integration tests
├── dist/               # Deployable static build output (git-ignored)
└── package.json
```

---

## 🔐 Architecture Contracts

1. **Independent Micro-Sites**: Every business has its own folder (`/b/<id>/`) containing its own `index.html`, `style.css`, `script.js`, `b.json`, and assets (`i/`). No business shares runtime page code with any other.
2. **Permanent Canonical URLs**: Cards encode `{publicBaseUrl}/b/{id}/`, which handles Link Hub display or Direct Review redirection on client load.
3. **Zero Secrets in Deployment**: The local manager API and admin console are strictly local development tools and are never included in static distribution artifacts.
