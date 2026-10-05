# Ritesh Sah — Data Science Portfolio

A dark-themed, single-page portfolio built with plain HTML, CSS, and JavaScript.

## Structure

```
RITESH-PORTFOLIO/
├── assets/
│   ├── images/
│   │   └── profile.jpg      # cropped headshot (swap anytime)
│   └── resume/
│       └── (add Ritesh_Sah_Resume.pdf here)
├── css/
│   └── style.css
├── js/
│   └── script.js
├── index.html
└── README.md
```

## How to run

Just open `index.html` in a browser — no build step needed.

## Still pending (placeholders in index.html)

- [ ] Resume PDF → `assets/resume/Ritesh_Sah_Resume.pdf` (Resume button will 404 until this is added)
- [ ] Real email → replace `your-email@gmail.com` (appears in nav, hero, and contact section)
- [ ] GitHub profile URL → replace `https://github.com/`
- [ ] LinkedIn profile URL → replace `https://www.linkedin.com/`
- [ ] Project links (4 projects) → replace `#` in each `.project-links a`
- [ ] Certification link → replace `#` in `.certificate-link`
- [ ] Optional: swap `assets/images/profile.jpg` for a more formal headshot

## Notes

- Accent color and all design tokens live in `:root` at the top of `css/style.css` — change `--accent` to restyle the whole site.
- Mobile nav toggle, scroll-based active nav highlighting, and scroll-reveal animations are handled in `js/script.js`.
