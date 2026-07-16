# SEED Python — Unreal Editor world generator

This is the compiler-free Unreal route for SEED. It is a Blueprint-only project with an Unreal Python script that generates a deterministic 3D proof world from engine primitives.

## Generate the world

1. Open `SEEDPython.uproject` in Unreal Engine 5.8.
2. Choose **File → Execute Python Script**.
3. Run `Content/Python/seed_world.py`.
4. Open `/Game/Generated/SEEDPythonWorld` if it is not already open, then select `SEED • cinematic overview` in the Outliner and pilot it to inspect the result.

The first run produces terrain blocks shaped by layered noise, a river, 180 procedural trees, resource nodes, six settlements, varied houses, and 60 original 3D resident figures. Re-running the script replaces generated `SEED` actors with the same seed-derived world.

## Important boundary

Unreal Python executes in the **editor**, not in a packaged game or Play-in-Editor. It is ideal for building and regenerating the world without C++ compilation. Runtime movement and simulation should later be implemented with Blueprints (no compiler required) or C++ after the Visual Studio toolchain update.
