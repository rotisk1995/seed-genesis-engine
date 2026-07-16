"""Generate SEED's proof-world inside the Unreal Editor without a C++ module.

Run from Unreal: File > Execute Python Script > seed_world.py
The script is deterministic; change WORLD_SEED to evolve a different world.
"""

import math
import random
import unreal

WORLD_SEED = 260716
MAP_PATH = "/Game/Generated/SEEDPythonWorld"
MATERIAL_PATH = "/Game/Generated/Materials"
WORLD_HALF = 12000.0
TERRAIN_GRID = 28
BASE_HEIGHT = -950.0

random.seed(WORLD_SEED)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
assets = unreal.get_editor_subsystem(unreal.EditorAssetSubsystem)
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

cube = unreal.load_asset("/Engine/BasicShapes/Cube.Cube")
sphere = unreal.load_asset("/Engine/BasicShapes/Sphere.Sphere")
cylinder = unreal.load_asset("/Engine/BasicShapes/Cylinder.Cylinder")
cone = unreal.load_asset("/Engine/BasicShapes/Cone.Cone")
base_material = unreal.load_asset("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")


def terrain_height(x, y):
    """Layered deterministic noise plus a carved meandering river basin."""
    broad = math.sin(x / 3150.0) * 260.0 + math.cos(y / 2700.0) * 220.0
    detail = math.sin((x + y) / 780.0) * 75.0 + math.cos((x - y) / 540.0) * 46.0
    ridge = abs(math.sin((x * .00020) + (y * .00013))) * 240.0
    river_distance = y + x * .34 + math.sin(x / 1550.0) * 780.0
    river = math.exp(-((river_distance / 1050.0) ** 2)) * 620.0
    edge = max(abs(x), abs(y)) / WORLD_HALF
    return broad + detail + ridge - river - (edge * edge) * 180.0


def material(name, color):
    path = MATERIAL_PATH + "/" + name
    existing = unreal.load_asset(path)
    if existing:
        return existing
    factory = unreal.MaterialInstanceConstantFactoryNew()
    instance = asset_tools.create_asset(name, MATERIAL_PATH, unreal.MaterialInstanceConstant, factory)
    instance.set_editor_property("parent", base_material)
    unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(instance, "Color", color)
    unreal.MaterialEditingLibrary.update_material_instance(instance)
    unreal.EditorAssetLibrary.save_loaded_asset(instance)
    return instance


MATS = {
    "ground": material("MI_SeedGround", unreal.LinearColor(.055, .24, .10, 1.0)),
    "river": material("MI_SeedRiver", unreal.LinearColor(.025, .22, .34, 1.0)),
    "trunk": material("MI_SeedTrunk", unreal.LinearColor(.17, .055, .012, 1.0)),
    "leaf": material("MI_SeedLeaf", unreal.LinearColor(.045, .38, .12, 1.0)),
    "wall": material("MI_SeedWall", unreal.LinearColor(.31, .12, .035, 1.0)),
    "roof": material("MI_SeedRoof", unreal.LinearColor(.12, .025, .018, 1.0)),
    "skin": material("MI_SeedSkin", unreal.LinearColor(.66, .34, .17, 1.0)),
    "parcel": material("MI_SeedParcel", unreal.LinearColor(.86, .48, .08, 1.0)),
    "resource": material("MI_SeedResource", unreal.LinearColor(.94, .66, .10, 1.0)),
}


def spawn_mesh(label, mesh, location, scale, material_asset, rotation=None):
    rotation = rotation or unreal.Rotator(0.0, 0.0, 0.0)
    actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*location), rotation)
    actor.set_actor_label(label)
    actor.set_editor_property("tags", [unreal.Name("SEED")])
    component = actor.static_mesh_component
    component.set_static_mesh(mesh)
    component.set_relative_scale3d(unreal.Vector(*scale))
    component.set_material(0, material_asset)
    component.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    return actor


def clear_seed_actors():
    for actor in actors.get_all_level_actors():
        tags = actor.get_editor_property("tags")
        if any(str(tag) == "SEED" for tag in tags):
            actors.destroy_actor(actor)


def add_terrain():
    tile = (WORLD_HALF * 2.0) / TERRAIN_GRID
    for row in range(TERRAIN_GRID):
        for column in range(TERRAIN_GRID):
            x = -WORLD_HALF + (column + .5) * tile
            y = -WORLD_HALF + (row + .5) * tile
            top = terrain_height(x, y)
            height = top - BASE_HEIGHT
            spawn_mesh(
                "Terrain_{:02d}_{:02d}".format(row, column), cube,
                (x, y, BASE_HEIGHT + height * .5),
                (tile / 100.0 * 1.015, tile / 100.0 * 1.015, height / 100.0),
                MATS["ground"],
            )

    river = spawn_mesh(
        "Seed_River", cube, (0.0, 0.0, -85.0),
        (175.0, 13.0, .08), MATS["river"], unreal.Rotator(0.0, -19.0, 0.0)
    )
    river.set_actor_label("SEED • living river")


def add_tree(x, y, index):
    z = terrain_height(x, y)
    scale = random.uniform(.55, 1.35)
    spawn_mesh("Tree_trunk_{:03d}".format(index), cylinder, (x, y, z + 90.0 * scale),
               (.16 * scale, .16 * scale, 1.15 * scale), MATS["trunk"])
    spawn_mesh("Tree_canopy_{:03d}".format(index), cone, (x, y, z + 265.0 * scale),
               (1.05 * scale, 1.05 * scale, 1.5 * scale), MATS["leaf"],
               unreal.Rotator(0.0, random.uniform(0.0, 360.0), 0.0))


def add_biome():
    resources = []
    for index in range(180):
        x = random.uniform(-11200.0, 11200.0)
        y = random.uniform(-9800.0, 9800.0)
        river_distance = abs(y + x * .34 + math.sin(x / 1550.0) * 780.0)
        if river_distance < 850.0:
            continue
        add_tree(x, y, index)

    for index in range(24):
        x = random.uniform(-9500.0, 9500.0)
        y = random.uniform(-8200.0, 8200.0)
        z = terrain_height(x, y)
        spawn_mesh("Resource_{:02d}".format(index), sphere, (x, y, z + 50.0),
                   (.40, .40, .40), MATS["resource"])
        resources.append((x, y, z))
    return resources


def add_house(x, y, serial, culture):
    z = terrain_height(x, y)
    width = random.uniform(1.15, 2.05)
    depth = random.uniform(1.10, 1.75)
    height = random.uniform(.95, 1.65)
    yaw = random.uniform(0.0, 360.0)
    spawn_mesh("House_{:03d}_walls".format(serial), cube, (x, y, z + height * 60.0),
               (width, depth, height), MATS["wall"], unreal.Rotator(0.0, yaw, 0.0))
    spawn_mesh("House_{:03d}_roof_a".format(serial), cube, (x, y, z + height * 152.0),
               (width * 1.16, depth * 1.18, .20), MATS["roof"], unreal.Rotator(27.0, yaw, 0.0))
    spawn_mesh("House_{:03d}_roof_b".format(serial), cube, (x, y, z + height * 152.0),
               (width * 1.16, depth * 1.18, .20), MATS["roof"], unreal.Rotator(-27.0, yaw, 0.0))


def add_resident(x, y, serial, culture, target):
    z = terrain_height(x, y)
    angle = math.degrees(math.atan2(target[1] - y, target[0] - x))
    shirt = material("MI_Culture_{:02d}".format(culture[0]), culture[1])
    spawn_mesh("Resident_{:03d}_body".format(serial), cylinder, (x, y, z + 88.0),
               (.32, .32, .67), shirt, unreal.Rotator(0.0, angle, 0.0))
    spawn_mesh("Resident_{:03d}_head".format(serial), sphere, (x, y, z + 172.0),
               (.27, .27, .27), MATS["skin"], unreal.Rotator(0.0, angle, 0.0))
    spawn_mesh("Resident_{:03d}_legs".format(serial), cylinder, (x, y, z + 33.0),
               (.18, .18, .50), MATS["roof"], unreal.Rotator(0.0, angle, 0.0))
    if serial % 3 == 0:
        spawn_mesh("Resident_{:03d}_material".format(serial), cube, (x + 34.0, y + 18.0, z + 95.0),
                   (.13, .13, .13), MATS["parcel"], unreal.Rotator(0.0, angle, 0.0))


def add_settlements(resources):
    sites = [(-5100.0, -3300.0), (-2450.0, 4100.0), (1700.0, -2900.0),
             (4800.0, 2500.0), (2600.0, 5900.0), (-6400.0, 2800.0)]
    cultures = [
        (0, unreal.LinearColor(.18, .67, .92, 1.0)), (1, unreal.LinearColor(.95, .31, .38, 1.0)),
        (2, unreal.LinearColor(.93, .67, .16, 1.0)), (3, unreal.LinearColor(.46, .29, .96, 1.0)),
        (4, unreal.LinearColor(.16, .86, .52, 1.0)), (5, unreal.LinearColor(.94, .21, .74, 1.0)),
    ]
    person = 0
    house = 0
    for site_index, (x, y) in enumerate(sites):
        for house_index in range(4 + site_index % 3):
            angle = (math.pi * 2.0 * house_index / (4 + site_index % 3)) + random.uniform(-.25, .25)
            radius = random.uniform(260.0, 620.0)
            add_house(x + math.cos(angle) * radius, y + math.sin(angle) * radius, house, cultures[site_index])
            house += 1
        for local in range(10):
            angle = random.uniform(0.0, math.pi * 2.0)
            radius = random.uniform(180.0, 850.0)
            target = resources[(person * 7 + site_index) % len(resources)]
            add_resident(x + math.cos(angle) * radius, y + math.sin(angle) * radius, person, cultures[site_index], target)
            person += 1


def add_atmosphere():
    sun = actors.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0.0, 0.0, 3000.0), unreal.Rotator(-43.0, -32.0, 0.0))
    sun.set_actor_label("SEED • sun")
    sun.set_editor_property("tags", [unreal.Name("SEED")])
    sun.get_component_by_class(unreal.DirectionalLightComponent).set_editor_property("intensity", 6.5)
    sky = actors.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0.0, 0.0, 0.0), unreal.Rotator())
    sky.set_actor_label("SEED • sky")
    sky.set_editor_property("tags", [unreal.Name("SEED")])
    sky.get_component_by_class(unreal.SkyLightComponent).set_editor_property("intensity", .7)
    fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(0.0, 0.0, 0.0), unreal.Rotator())
    fog.set_actor_label("SEED • atmosphere")
    fog.set_editor_property("tags", [unreal.Name("SEED")])
    fog.get_component_by_class(unreal.ExponentialHeightFogComponent).set_editor_property("fog_density", .012)
    camera_location = unreal.Vector(12600.0, -14900.0, 9700.0)
    camera = actors.spawn_actor_from_class(unreal.CineCameraActor, camera_location, unreal.MathLibrary.find_look_at_rotation(camera_location, unreal.Vector(0.0, 0.0, 150.0)))
    camera.set_actor_label("SEED • cinematic overview")
    camera.set_editor_property("tags", [unreal.Name("SEED")])


def generate():
    if assets.does_asset_exist(MAP_PATH):
        levels.load_level(MAP_PATH)
        clear_seed_actors()
    else:
        levels.new_level(MAP_PATH)
    add_terrain()
    resources = add_biome()
    add_settlements(resources)
    add_atmosphere()
    levels.save_current_level()
    unreal.log("SEED Python world generated: terrain, 60 residents, settlements, and procedural houses.")


generate()
