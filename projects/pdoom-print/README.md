# PRINTOUT — I'm Upping My P(doom), printed

A line printer from the 1970s prints the run log of a model that is turning into AGI, and the film is the paper.
Every image is struck in Courier on green-bar fanfold paper — pictures shape-matched into ASCII with overstrike for
the darks, black ribbon and the red half of a two-colour ribbon — and every lyric is typed onto the same paper the
moment it is sung. **No image model, no video model, no footage: every pixel is drawn by `kits/print.js` and the
code in `scenes/` and `lib/`.** Concept, style law and the shot list: `TREATMENT.md`.

Status: complete — the whole song, 0:00–2:36.65, 46 shots (the hook page `pdoom` four times).

```sh
uv run tools/render.py projects/pdoom-print check            # one frame per shot + the edit's notes
uv run tools/render.py projects/pdoom-print sheet --cuts     # contact sheet -> out/sheet.png
uv run tools/render.py projects/pdoom-print                  # export -> out/<title>.mp4
open projects/pdoom-print/index.html                         # live preview (space, d for the debug layer)
```

The song and its hand-checked word timing come from `../anime-pdoom/data/` and `../../../pdoom-video/audio/`
(shared with `anime-pdoom`, `pdoom-ds`, `pdoom-akari`), so nothing here carries lyric text.

| file | what |
|---|---|
| `TREATMENT.md` | concept, paper / ink / type rules, palette, motifs, camera, the 46-shot table |
| `timeline.js` | the edit: every cut is a beat found from its lyric line; page numbers for the running header |
| `lib/pp.js` | typed lyrics (word by word, letters ≤ 28 ms apart, never early), the page header with the P(doom) dial, `type`, stamps, a person, the eye, a z-buffered surface rasteriser, `warp`, characters as particles (`cellsOf`), the lyric slip drop-in |
| `scenes/*.js` | one shot each, 43 files (`pdoom` plays four times): the order is `project.js` → `scenes`, the timing is `timeline.js` |
| `art/styleframes/` | the four frames the treatment was approved with |

Fonts: Courier Prime (OFL), embedded in `kits/print.js`.
