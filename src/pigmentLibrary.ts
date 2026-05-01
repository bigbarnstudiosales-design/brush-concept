import type { Pigment } from "./types";

export const pigmentLibrary: Pigment[] = [
  {
    id: "red",
    name: "Red",
    color: [0.79, 0.08, 0.05],
    tintingStrength: 0.88,
    opacity: 0.72,
    granulation: 0.16,
    diffusion: 0.42,
  },
  {
    id: "yellow",
    name: "Yellow",
    color: [0.96, 0.67, 0.08],
    tintingStrength: 0.78,
    opacity: 0.64,
    granulation: 0.1,
    diffusion: 0.58,
  },
  {
    id: "blue",
    name: "Blue",
    color: [0.06, 0.32, 0.75],
    tintingStrength: 0.94,
    opacity: 0.68,
    granulation: 0.24,
    diffusion: 0.5,
  },
  {
    id: "green",
    name: "Green",
    color: [0.08, 0.47, 0.2],
    tintingStrength: 0.82,
    opacity: 0.66,
    granulation: 0.2,
    diffusion: 0.48,
  },
  {
    id: "violet",
    name: "Violet",
    color: [0.42, 0.13, 0.62],
    tintingStrength: 0.86,
    opacity: 0.7,
    granulation: 0.22,
    diffusion: 0.44,
  },
  {
    id: "black",
    name: "Black",
    color: [0.08, 0.07, 0.05],
    tintingStrength: 1,
    opacity: 0.9,
    granulation: 0.28,
    diffusion: 0.32,
  },
];

export const pigmentPalette = pigmentLibrary.map((pigment) => pigment.color);
