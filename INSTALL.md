# Installing / Building neu3d

`neu3d` is the WebGL (three.js) rendering library used by the
NeuroMynerva JupyterLab extension. It builds a single UMD bundle,
`lib/neu3d.min.js` (the package `main`), via webpack.

There are two ways to obtain `neu3d`, depending on whether you are
developing it or just consuming a released build.

---

## Option A — Local build from source (development)

Use this when you are changing `neu3d` itself (e.g. the renderer,
`parseNSDict`, `export()`), or when NeuroMynerva should pick up your local
edits via its `neu3d@file:../neu3d` dependency.

### Prerequisites
- **Node.js** ≥ 16 and **npm** (or `jlpm`, JupyterLab's pinned yarn).

### Steps
```bash
cd neu3d
npm install          # install JS dependencies
npm run build        # webpack -> lib/neu3d.min.js
```

Runtime dependencies include `three`, `jquery`, `bootstrap`, `dat.gui`,
`lodash`, `stats.js`, and `@fortawesome/fontawesome-free`.

### Development helpers
```bash
npm run watch        # rebuild on change (alias: npm run dev)
npm run lint         # eslint src/**
npm run clean        # rimraf lib
```

Quick syntax check without a full build:
```bash
node --check src/render.js
node --check src/neu3d.js
```

### Letting NeuroMynerva use this local build
NeuroMynerva expects the two repos side-by-side and declares
`"neu3d": "file:../neu3d"`:

```
parent/
├── neu3d/          <- this repo
└── NeuroMynerva/
```

> **Refresh after rebuilding.** A `file:` dependency is installed as a
> *copy*, not a live symlink, so `NeuroMynerva/node_modules/neu3d` is
> stale until refreshed. From the NeuroMynerva repo run `jlpm install`,
> or copy the bundle directly:
> ```bash
> cp ../neu3d/lib/neu3d.min.js node_modules/neu3d/lib/neu3d.min.js
> ```
> Then rebuild NeuroMynerva. See `NeuroMynerva/INSTALL.md`.

---

## Option B — Install the published package from npm

Use this when another project just needs the released renderer and you are
**not** modifying `neu3d`.

```bash
npm install neu3d          # or: jlpm add neu3d
```

This pulls the prebuilt `lib/neu3d.min.js` and `typings/index.d.ts` from
the npm registry. To pin a version:

```bash
npm install neu3d@1.2.0
```

In this mode NeuroMynerva should depend on a version range
(`"neu3d": "^1.2.0"`) instead of `file:../neu3d`; see Option B in
`NeuroMynerva/INSTALL.md`.
