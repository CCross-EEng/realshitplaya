# Chris Cross — Controls Portfolio

Static portfolio site (plain HTML/CSS/JS, no build step). Open `index.html` or serve the folder:

```
python -m http.server 8000
```

## Pages
| File | Rubric item |
|---|---|
| `index.html` | Cover (animated controller schematic) → scrolls into the rotating contents index |
| `about.html` | Welcome, contact info, career objective |
| `senior-design.html` | Senior design (EE 4910/4920): description, role, skills, supporting docs, big picture |
| `projects.html` | 4 projects: description, role, skills, resources, supporting docs |
| `resume.html` | Résumé (HTML + PDF), research, awards, activities |
| `reflections.html` | General education + cumulative reflections |
| `ethics.html` | Ethics paper |

## Filling in content
Search the HTML for `class="todo"` — every placeholder is marked and renders as a dashed "TODO" box.
Supporting PDFs go in `docs/`, the résumé PDF is `assets/Christopher_Cross_Resume.pdf`.

## Scripts
- `js/pcb.js` — PCB/controller schematic generator + anime.js animation (cover, and faint traces on dark pages)
- `js/cover.js` — cover configuration and chip readout
- `js/side.js` — faint left-edge traces on dark pages
- `js/contents.js` — rotating geodesic contents index (canvas)
- `js/common.js` — scroll reveals and page transitions
