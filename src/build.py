#!/usr/bin/env python3
"""Builds the Manorath site.

1. Fills src/index.src.html with the product, industry and step data from
   src/data.py and writes index.html.
2. Bundles src/forge.js (the 3D product models) with the parts of Three.js it
   uses into js/forge.min.js.

Run it after editing anything in src/:   python3 src/build.py
Needs esbuild for step 2 (any install; set ESBUILD=/path/to/esbuild if it isn't on PATH).
"""
import html, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from data import LINES, INDUSTRIES, STRENGTHS, STEPS, VISION  # noqa: E402

V = '53'   # cache-busting version for css/js: bump after changing them
E = html.escape
ARR = '<svg class="arr" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
ITEMS = [dict(it, line=l) for l in LINES for it in l['items']]


def ticker():
    words = []
    for l in LINES:
        words += [l['name']] + l['tags'] + [it['name'] for it in l['items']]
    return ''.join(f'<span>{E(w)}</span><i></i>' for w in words)


def forge_tabs():
    return ''.join(f'<button type="button" role="tab" data-line="{i}" aria-selected="{"true" if i == 0 else "false"}" data-cursor="View"><small>{l["no"]}</small>{E(l["short"])}</button>'
                   for i, l in enumerate(LINES))


def forge_panels():
    out = []
    for i, l in enumerate(LINES):
        lis = ''.join(f'<li>{E(it["name"])}</li>' for it in l['items'])
        out.append(f'''
          <article class="fp{" is-on" if i == 0 else ""}" data-fp="{i}"{"" if i == 0 else " hidden"}>
            <span class="fp__no" aria-hidden="true">{l["no"]}</span>
            <h2>{E(l["name"])}</h2>
            <p class="fp__tags mono">{" · ".join(E(t) for t in l["tags"])}</p>
            <p class="fp__lede">{E(l["lede"])}</p>
            <ul>{lis}</ul>
            <a class="fp__go" href="#catalogue" data-cat-jump="{l["key"]}">See the {len(l["items"])} items in the catalogue {ARR}</a>
          </article>''')
    return ''.join(out)


def forge_fallback():
    return ''.join(f'<img src="assets/bg/sm/{l["photo"]}.webp" alt="" data-fb="{i}" width="640" height="480" loading="lazy"{" class=is-on" if i == 0 else ""}>' for i, l in enumerate(LINES))


def cat_tabs():
    tabs = [('all', 'All', len(ITEMS))] + [(l['key'], l['short'], len(l['items'])) for l in LINES]
    return ''.join(f'<button type="button" role="tab" data-filter="{k}" aria-selected="{"true" if k == "all" else "false"}">{E(t)}<sup>{n}</sup></button>' for k, t, n in tabs)


def cards():
    return ''.join(f'''
        <article class="pc" data-cat="{it["line"]["key"]}" data-text="{E((it["name"] + " " + it["line"]["name"] + " " + " ".join(it["forms"]) + " " + " ".join(it["line"]["tags"])).lower())}" data-tilt>
          <div class="pc__img"><img src="assets/products/sm/{it["photo"]}.webp" alt="{E(it["name"])}" width="640" height="480" loading="lazy"><span class="pc__no mono">{it["line"]["no"]}.{n}</span></div>
          <div class="pc__body">
            <p class="pc__cat mono">{E(it["line"]["name"])}</p>
            <h3>{E(it["name"])}</h3>
            <p class="pc__forms">{E(" · ".join(it["forms"]))}</p>
            <p class="pc__ask"><small class="mono">To quote</small>{E(it["ask"])}</p>
            <button class="add" type="button" data-add="{it["id"]}" data-name="{E(it["name"])}" data-cursor="Add"><i aria-hidden="true"></i><span>Add to list</span></button>
          </div>
        </article>''' for l in LINES for n, it in enumerate(l['items'], 1) for it in [dict(it, line=l)])


def marq(rows):
    return ''.join(f'<span>{E(d["name"])}</span><i></i>' for d in rows)


def inds():
    by = {l['key']: l for l in LINES}
    return ''.join(f'''<li data-reveal><span class="mono">{i:02d}</span><b>{E(d["name"])}</b><p>{E(d["need"])}</p><small class="mono">{" · ".join(E(by[k]["short"]) for k in d["lines"])}</small></li>'''
                   for i, d in enumerate(INDUSTRIES, 1))


def steps():
    return ''.join(f'<li data-reveal><i class="proc__node" aria-hidden="true"></i><span class="mono">{i:02d}</span><h3>{E(t)}</h3><p>{E(d)}</p></li>' for i, (t, d) in enumerate(STEPS, 1))


def strengths():
    return ''.join(f'<article data-reveal data-wipe><span class="mono">{i:02d}</span><h3>{E(t)}</h3><p>{E(d)}</p></article>' for i, (t, d) in enumerate(STRENGTHS, 1))


def build_html():
    src = open(os.path.join(HERE, 'index.src.html')).read()
    half = len(INDUSTRIES) // 2
    blocks = dict(v=V, arr=ARR, ticker=ticker(), forge_tabs=forge_tabs(), forge_panels=forge_panels(),
                  forge_fallback=forge_fallback(), cat_tabs=cat_tabs(), cards=cards(),
                  marq_a=marq(INDUSTRIES[:half]), marq_b=marq(INDUSTRIES[half:]), inds=inds(), steps=steps(),
                  strengths=strengths(), vision=E(VISION),
                  options=''.join(f'<option>{E(l["name"])}</option>' for l in LINES))
    out = re.sub(r'\{\{(\w+)\}\}', lambda m: blocks[m.group(1)], src)
    open(os.path.join(ROOT, 'index.html'), 'w').write(out)


def build_js():
    esb = os.environ.get('ESBUILD') or shutil.which('esbuild') or '/home/kali/VS_Code/OpenSea/node_modules/.bin/esbuild'
    subprocess.run([esb, os.path.join(HERE, 'forge.js'), '--bundle', '--minify', '--format=esm', '--target=es2020',
                    '--alias:three=' + os.path.join(HERE, 'vendor', 'three.module.js'),
                    '--outfile=' + os.path.join(ROOT, 'js', 'forge.min.js'), '--log-level=warning'], check=True)


if __name__ == '__main__':
    build_html()
    build_js()
    print('built index.html and js/forge.min.js (v' + V + ')')
