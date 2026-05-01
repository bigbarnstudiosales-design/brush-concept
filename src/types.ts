export type Rgb = readonly [number, number, number];

export type ViewMode = "color" | "wetness" | "load" | "tooth";

export interface Point {
  x: number;
  y: number;
}

export interface Pigment {
  id: string;
  name: string;
  color: Rgb;
  tintingStrength: number;
  opacity: number;
  granulation: number;
  diffusion: number;
}
