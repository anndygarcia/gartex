# Gartex Construction Company — Website

Static website for [gartex-construction.com](https://gartex-construction.com), a Houston-area custom home framing and cornice company.

## Stack

- Plain HTML + CSS + vanilla JS
- Self-hosted drone video (MP4 + WebM)
- Optimized JPG photos
- No build step — open `index.html` and you're done

## Local development

```bash
# Serve locally (any static server works)
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Deploy

Hosted on **Cloudflare Pages**, connected to this repo.

Every push to `main` auto-deploys to `gartex-construction.com`.

To deploy manually:
1. Cloudflare dashboard → Pages → `gartex-construction.com` → "Create deployment"
2. Or: just push to `main` — auto-deploys in ~30s

## File layout

```
.
├── index.html                  # Main page (homepage)
├── styles.css                  # All styles
├── assets/
│   ├── media/                  # Hero video + poster
│   │   ├── hero.mp4
│   │   ├── hero.webm
│   │   └── hero-poster.jpg
│   └── projects/               # Project photos
│       ├── home-1.jpg
│       ├── home-2.jpg
│       ├── framing-1.jpg
│       └── framing-2.jpg
└── README.md
```

## Contact

Gartex Construction Company
Houston, Texas
Phone: (713) 703-6355
Email: Gartexbuilders@gmail.com