# Build UI design note

Build is a workbench for organizing Prompt Atlas, not a storefront or a generic
dashboard. It inherits Barz-Gregator's graphite/steel palette and orange signal,
then uses a colder blue only for technical state such as the registry revision.
The condensed system type stack avoids a network font dependency.

Layout:

```text
┌ fixed Atlas rail ┬ Build / revision                               ┐
│ Deck             │ ┌ ordered workshop stack ┬ selected inspector ┐│
│ configurable     │ │ drag / select / create  │ rename / move      ││
│ workshops        │ │                         │ tools / recipe test ││
│ Backstage        │ └ defaults / backups ─────┴────────────────────┘│
│ Build selected   │                                                 │
└──────────────────┴─────────────────────────────────────────────────┘
```

The workshop stack is the memorable interaction. Borders and numbering encode
order; orange indicates current selection or the action that commits a change.
There are no decorative gradients, card grid, or looping animation. Drag has
visible feedback; Move up/Move down remain available for keyboard and precise
control. Reduced-motion preferences are honored.

The first visual review found that the empty inspector and selected inspector
were both laid out because author CSS overrode the browser's `hidden` behavior.
The global hidden rule was restored before sign-off. Dynamic user strings are
created with `textContent`; the UI contains no dynamic `innerHTML` path.
