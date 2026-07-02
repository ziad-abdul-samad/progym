# Design System Strategy

## Brand source

Logo and image assets belong in `frontend/public/images`. When the real assets are available, derive color, contrast, photography treatment, and motion direction from those files.

## Tokens

CSS variables in `frontend/src/styles/globals.css` are the single source for:

- Background and foreground
- Accent color
- Card, border, input, and ring colors
- Radius scale
- ShadCN UI color aliases

Current tokens are neutral dark defaults with a high-contrast training accent. They are placeholders until real brand assets are provided.

## Component strategy

- ShadCN primitives remain low-level and easy to replace.
- Product components should be built in feature folders or `src/components/layout`.
- Dashboard components prioritize dense data, clear hierarchy, and low motion.
- Public components can use richer motion and 3D, but must preserve performance and accessibility.
