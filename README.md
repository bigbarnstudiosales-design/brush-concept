# Natural Paint Prototype

A minimal browser-based natural media paint prototype built with Vite, TypeScript, and one HTML canvas.

This is a proof-of-life engine test, not a full painting app. It keeps the model intentionally small and readable:

- one canvas
- one brush
- no UI framework
- no layers
- pigment-style color mixing
- pickup, deposit, directional smear, wetness, load, drying, and generated paper tooth

## Setup

```sh
npm install
npm run dev
```

## Build and Test

```sh
npm run build
npm test
```

The tests cover the replaceable pigment mixing approximation and wetness decay.

## Controls

- Draw with mouse, stylus, or touch through Pointer Events.
- `1`-`6` switch pigment colors.
- `D` clears the canvas.
- `W` toggles wetness debug view.
- `L` toggles load debug view.
- `T` toggles paper tooth debug view.
- `C` returns to color view.

## File Structure

- `src/main.ts` wires canvas input, keyboard controls, and animation.
- `src/paintEngine.ts` owns the color, wetness, load, and tooth buffers.
- `src/pigment.ts` contains the absorption-style pigment mixer so it can be replaced later.
- `src/wetness.ts` contains drying helpers.
- `src/tooth.ts` generates the paper texture.
