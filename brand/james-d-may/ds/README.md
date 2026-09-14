# James D. May Books: Claude Design bundle

A component library shaped for `DesignSync`, built from the design system in `../canvas/`.
Nineteen preview files, one component each, every one carrying a first-line `@dsCard` marker.

Each preview is self-contained: tokens are inlined, the only external reference is Google Fonts.
Nothing here imports a shared stylesheet, so a card renders correctly on its own.

## Sync it

`/design-sync` cannot run from a Claude Code web session. Run `/design-login` once from Claude Code
in a terminal on your own machine, then from this directory:

1. `list_projects`. Find a writable design-system project, or `create_project` if there is none.
2. `get_project`. Confirm the target is `type: PROJECT_TYPE_DESIGN_SYSTEM`. That type is fixed at
   creation, so pushing to a regular project never turns it into a design system.
3. `list_files`. Diff against what is already there.
4. `finalize_plan` with `localDir` set to this directory and these write patterns:

```
foundations/*.html   brand/*.html    actions/*.html
forms/*.html         navigation/*.html
content/*.html       covers/*.html   email/*.html
social/*.html        tokens/*        marks/*.svg
cards.reference.json
```

5. `write_files` with the returned `planId`, using `localPath` for every file so contents upload
   straight from disk.

Sync one component at a time when you are changing things. Never wholesale-replace the project.

## Cards

| Group | Path | Name | Viewport |
|---|---|---|---|
| Foundations | `foundations/colour.html` | Colour | 940 x 600 |
| Foundations | `foundations/space.html` | Space and geometry | 940 x 440 |
| Foundations | `foundations/type.html` | Type | 940 x 660 |
| Brand | `brand/reticle.html` | Reticle and monogram | 940 x 540 |
| Brand | `brand/wordmark.html` | Wordmark | 940 x 640 |
| Actions | `actions/button-primary.html` | Button, primary | 880 x 260 |
| Actions | `actions/button-secondary.html` | Button, secondary | 880 x 260 |
| Forms | `forms/newsletter.html` | Newsletter field | 820 x 420 |
| Navigation | `navigation/footer.html` | Footer | 1240 x 400 |
| Navigation | `navigation/nav.html` | Navigation bar | 1240 x 200 |
| Content | `content/coming-next.html` | Coming next | 820 x 300 |
| Content | `content/cover-card.html` | Cover card | 820 x 340 |
| Content | `content/excerpt-panel.html` | Excerpt panel | 780 x 460 |
| Content | `content/pull-quote.html` | Pull quote | 900 x 300 |
| Content | `content/retailer-strip.html` | Retailer strip | 900 x 260 |
| Covers | `covers/cover-grid.html` | Cover grid | 1240 x 760 |
| Email | `email/newsletter-email.html` | Newsletter email | 1360 x 1080 |
| Social | `social/landscape-16x9.html` | Landscape cards, 16:9 | 940 x 420 |
| Social | `social/story-9x16.html` | Story cards, 9:16 | 1400 x 620 |

## What is unverified

**The `@dsCard` attribute set.** Only `group=` is confirmed by the DesignSync tool description. The
markers here also carry `name`, `subtitle`, `width` and `height` on the assumption that they mirror
the `register_assets` fields. If the app's self-check reads only `group`, the cards will land
ungrouped or unnamed. `cards.reference.json` holds the same metadata in the exact shape
`register_assets` expects, so the fallback is to drive that method from it. That is why the file
exists and why it is in the write list.

**The sync itself.** None of this was tested against the live API. It was built in a session with no
design-system authorization, so the first real push is also the first test.

## Rules the previews follow

- Signal appears once per composition. Covers take two. The dot inside a mark never counts, and
  reds inside a cover image belong to the cover rather than the screen around it.
- Signal never sets text below 24px. Button fills use `#C31219`, not `#D4141B`.
- Fog is light only, capped at 24% opacity. Ember is photography only.
- Square corners, 2px maximum radius, 48px default controls, 44px tap floor.
- Three typefaces. The display face never sets body copy; the reading face never enters a control.
