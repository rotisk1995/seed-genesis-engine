# SEED Genesis — Unreal prototype

This is the 3D runtime direction for SEED. It produces a world from one deterministic seed rather than relying on a hand-authored level or imported marketplace pack.

At play time it creates:

- a 160 × 160 vertex-coloured terrain mesh with valleys, rivers, rolling ground, and mountainous areas;
- hundreds of variably sized procedural trees and distributed material sites;
- six settlements with different cultural pigments;
- 64 autonomous, animated, three-dimensional residents assembled from Unreal geometry;
- visible carried material parcels, with residents traveling between source sites and their settlement; and
- varied 3D houses that appear after real material deliveries reach a settlement.

## Open it

Open `SEEDGenesis.uproject` in Unreal Engine 5.8 and press Play. The project starts in the engine's empty entry map; `ASeedGenesisGameMode` generates the world and places a cinematic overview camera at runtime.

This machine has Unreal Engine 5.8 but its installed C++ compiler is MSVC 14.38. Unreal 5.8 requires the newer MSVC 14.50.35717 toolchain, so the first native build is blocked by an Unreal engine-header error before SEED source is compiled. Update the Visual Studio 2022 C++ build tools to the version requested by Unreal, then reopen the project and allow it to compile. No source changes are needed for that toolchain update.

## Design boundary

The residents are original procedural 3D figures created from engine primitives; no identity, likeness, or marketplace character asset is included. A later art pass can replace those meshes with properly licensed character and environment assets without changing the world-generation rules.
