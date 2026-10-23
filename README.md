# Manorath Enterprises: website ("molten steel" version)

A static one-page site. To view it locally:

```bash
python3 -m http.server 5198 --directory manorath-site
```

Earlier versions are kept next to this folder: `manorath-site-classic/` (white one-page site with line-art backgrounds and the catalogue) and `manorath-site-multipage/` (the 11-page version).

## What's on the page

| Section | What happens |
|---|---|
| Hero (calm on purpose) | Warm paper background, the copy on the left, and the logo building itself on the right: the maroon and green strokes settle in, the gold swoosh pours into its groove, the wordmark letters rise one by one. Then it floats, light glints along the swoosh, slow rings ripple out behind it, and it leans a little toward the cursor. A slow, quiet product ticker runs along the bottom. The logo is redrawn as clean vector shapes (traced from `assets/mark.png`) so it stays sharp at any size |
| Product lines | Each line as a 3D metal model (`src/forge.js`): stainless spool, crossed I-beams, copper coil with brass and aluminium bars, bolted flange pair with clamp. Click a line to switch, drag to turn. It cycles on its own until someone clicks or hovers |
| Catalogue | All 16 product groups: tabs, search, cards that tilt toward the cursor, **Add to list** (with sparks) |
| Industries | Two marquees of industry names over a night refinery; eight cells that fill orange from where the cursor enters |
| How it works | Material runs down a pipe and lights each of the five steps (plays once when it comes into view) |
| Company | Six strengths; gold fills each cell from the side the cursor came in |
| Vision | The words heat up one after another like a bar out of the furnace |
| Enquiry | The form, with the enquiry list attached |

Also: a cursor ring with labels (Drag, Add, View), magnetic buttons, sparks on click, a full-screen menu with photos. Scrolling only triggers one-off reveals; nothing is scrubbed by scroll position. With reduced motion everything stays still.

**Enquiry list.** Kept in the visitor's browser; the header button opens it, each item takes a size/quantity note, and it goes into the form. The form opens the visitor's email app (or WhatsApp if only a WhatsApp number is set). There is no server.

## Before going live

1. Fill in `CONTACT` at the top of `js/main.js` (phone, email, WhatsApp, address). Until then those lines stay hidden.
2. Have the client read the product descriptions and industry text in `src/data.py` (general trade knowledge written for the site).
3. Photos are Pexels stock (`assets/bg/CREDITS.txt`); swap in their own when available.

## Editing

Edit files in `src/`, then run:

```bash
python3 src/build.py
```

- `src/index.src.html`: the page; `{{name}}` blocks are filled from `src/data.py` (products, industries, steps, strengths, vision).
- `src/forge.js`: the 3D models, bundled with the parts of Three.js it uses into `js/forge.min.js` (needs esbuild; set `ESBUILD=` if it isn't on PATH). It loads only when the product section comes near, so the first load stays light.
- `css/style.css`, `js/main.js` (contact, menu, list, catalogue, form), `js/fx.js` (sparks, cursor, logo tilt, hover effects, timed animations) are edited directly. Bump `V` in `src/build.py` after changing them.
- `src/vendor/` (Three.js) is only needed for building; don't upload `src/` with the site.
