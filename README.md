# Chris Cross — Controls Portfolio

Single-page static site (plain HTML/CSS/JS, no build step). Open `index.html` or serve the folder:

```
python -m http.server 8000
```

## Sections (all in `index.html`, top to bottom)
| Anchor | Rubric item |
|---|---|
| `#cover` | Welcome page: live simulation of the Quanser SRV02-ET + ROTPEN-E rotary inverted pendulum |
| `#contents` | Rotating contents index (black) |
| `#about` | Introduction + career objective |
| `#senior-design` | Senior design: description, role, skills, supporting docs, big picture |
| `#projects` `#quadcopter` `#plc` `#cmos` | 4 projects: description, role, skills, resources, docs |
| `#skills` | Skills grid with real logos (black) |
| `#resume` | Résumé PDF + download |
| `#reflections` (`#gen-ed`, `#cumulative`) | General education (to be added) + cumulative reflection, shown as a paper |
| `#ethics` | Ethics paper ("What is an ethical engineer?"), shown as a paper |
| `#contact` | Contact with the ASCII sword (black) |

## Filling in content
Missing content shows on the page as "To be added". The guidance for each one sits next to it in an
HTML comment: search `index.html` for `TODO`. Supporting PDFs go in `docs/`; the résumé PDF is
`assets/Christopher_Cross_Resume.pdf`. The LinkedIn link in `#contact` still needs Chris's profile URL.

Written papers (the reflections and the ethics paper) are a `.doc` block: a sheet showing page 1 that opens
the whole paper in a reader, next to a PDF download. Each `.doc` holds the paper's text in a `<template>`, one
`.pg` per page of the original PDF (`.pg.mla` for MLA papers in Times, `.pg.std` for Arial ones), and points
at its PDF in `docs/` through `data-pdf`.

## Theme
Light and dark modes. The header button toggles them and the choice is saved in `localStorage`; first
visits follow the system setting. Theme tokens live at the top of `css/style.css`.

## Scripts
- `js/rotpen.js`: nonlinear pendulum model (RK4, 1 kHz) with the Lab 4 parameters, the Lab 5 balance gain K
  and an energy swing-up; `node -e "require('./js/rotpen.js')"` loads it outside the browser
- `js/hero3d.js`: three.js line drawing of the SRV02 + pendulum, scope, readouts, push / orbit controls
- `js/contents.js`: rotating geodesic contents index (canvas)
- `js/skills.js`: 3D favicon tilt and the drifting dust in the skills spotlight
- `js/ascii-sword.js`: the contact section's ASCII sword
- `js/pcb.js` + `js/side.js`: faint PCB traces on the left of each section
- `js/papers.js`: puts page 1 of each paper on its sheet and opens the full paper in the reader (`#reader`)
- `js/common.js`: scroll reveals, theme toggle, glass header, current-section marker, mobile menu

Logos load from Simple Icons (jsDelivr), Wikimedia Commons and bitcraze.io.
