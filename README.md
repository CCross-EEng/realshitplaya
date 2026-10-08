# Chris Cross — Controls Portfolio

Single-page static site (plain HTML/CSS/JS, no build step). Open `index.html` or serve the folder:

```
python -m http.server 8000
```

## Sections (all in `index.html`, top to bottom)
| Anchor | Rubric item |
|---|---|
| `#cover` | Welcome page: 3D rotary inverted pendulum (three.js + anime.js) |
| `#contents` | Rotating contents index (black) |
| `#about` | Introduction + career objective |
| `#senior-design` | Senior design: description, role, skills, supporting docs, big picture |
| `#projects` `#quadcopter` `#plc` `#cmos` | 4 projects: description, role, skills, resources, docs |
| `#resume` | Résumé PDF + download |
| `#reflections` (`#gen-ed`, `#cumulative`) | General education + cumulative reflections |
| `#ethics` | Ethics paper |
| `#contact` | Contact (black) |

## Filling in content
Search `index.html` for `class="todo"`; every placeholder renders as a dashed "TODO" box.
Supporting PDFs go in `docs/`; the résumé PDF is `assets/Christopher_Cross_Resume.pdf`.

## Scripts
- `js/hero3d.js`: cover 3D pendulum and its swing-up / balance / disturbance sequence
- `js/contents.js`: rotating geodesic contents index (canvas)
- `js/pcb.js` + `js/side.js`: faint PCB traces on the left of each section
- `js/common.js`: scroll reveals, nav visibility, current-section marker
