# Natural Paint Architecture

The engine should keep brush behavior, pigment behavior, and surface behavior separate.

## Brush Behavior

Brushes decide how contact happens. A brush can change shape, coverage, texture, deposit pattern, drag, pressure response, and pickup behavior without owning pigment chemistry.

Current scaffold:

- `src/brushBehavior.ts`
- `BrushBehavior`
- `TexturedRoundBrush`

## Pigment Behavior

Pigments decide how color/material behaves. A pigment can define color, opacity, tinting strength, granulation, diffusion, staining, and mixing response without owning brush shape.

Current scaffold:

- `src/pigmentLibrary.ts`
- `src/pigment.ts`
- `Pigment`

## Surface Behavior

The surface owns paper state and canvas material buffers. Paper can affect absorbency, tooth, wetness, and rendering without being mixed into pigment unless a future material model explicitly asks for it.

Current scaffold:

- `src/surface.ts`
- `PaintSurface`

## Engine Role

`PaintEngine` coordinates these systems. It should not become the permanent home for every brush, pigment, and paper rule. When a rule clearly belongs to one domain, move it into that domain.

The current prototype still stores mixed RGB color plus coverage/wetness. A later material model should store pigment amounts per pixel so different brushes can move the same pigments without losing pigment identity.
