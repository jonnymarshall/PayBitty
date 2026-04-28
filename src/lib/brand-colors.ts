// Brand palette — mirror of the canonical hex values declared in
// src/app/globals.css (see the comment on the `.dark` block:
// "#0A0A0A bg, #181818 surface, #DE3C4B accent, #7C7F65 muted").
//
// CSS variables in globals.css use OKLCH, which cannot be inlined into
// non-CSS contexts (e.g. @react-pdf/renderer). When the brand redesign
// updates globals.css, update the hex values here in lockstep — both
// surfaces consume the same source of truth.
export const brandColors = {
  background: "#0A0A0A",
  surface: "#181818",
  primary: "#DE3C4B",
  muted: "#7C7F65",
  foreground: "#0A0A0A",
  paper: "#FFFFFF",
} as const;

export type BrandColor = keyof typeof brandColors;
