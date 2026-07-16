import * as THREE from "/vendor/three.module.js";

function mixPigments(pigments, weights = []) {
  const layers = pigments.map((pigment, index) => ({ pigment, weight: weights[index] ?? 1 })).filter((layer) => layer.pigment && layer.weight > 0);
  if (!layers.length) return [127, 160, 142];
  const total = layers.reduce((sum, layer) => sum + layer.weight, 0) || 1;
  return [0, 1, 2].map((channel) => layers.reduce((sum, layer) => sum + layer.pigment[channel] * layer.weight, 0) / total);
}

function pigmentColor(pigment) {
  return new THREE.Color(Math.max(0, Math.min(255, pigment[0])) / 255, Math.max(0, Math.min(255, pigment[1])) / 255, Math.max(0, Math.min(255, pigment[2])) / 255);
}

function worldPigment(world) {
  return [24 + world.conditions.cohesion * 1.42 + world.conditions.mystery * .26, 31 + world.conditions.abundance * 1.56 + world.conditions.water * .34, 32 + world.conditions.water * 1.18 + world.conditions.mystery * .92];
}

function residentPigment(particle, world) {
  const needs = particle.needs;
  const experiential = [58 + needs.belonging * .98, 50 + needs.food * .96 + particle.knownSites.length * 11, 56 + needs.wonder * .98 + Math.min(88, particle.memories * 7)];
  return mixPigments([particle.pigment, particle.imprint, experiential, worldPigment(world), particle.carrying?.pigment], [.36, .3, .2, .14, particle.carrying ? .36 : 0]);
}

function settlementPigment(snapshot, index) {
  const work = snapshot.works?.[index];
  const residents = snapshot.particles.filter((particle) => particle.homeIndex === index);
  const residentMix = residents.length ? mixPigments(residents.map((particle) => residentPigment(particle, snapshot.world))) : [120, 150, 130];
  const materials = work?.pigments?.length ? mixPigments(work.pigments) : null;
  return mixPigments([residentMix, materials, work?.culturePigment], [.58, materials ? .3 : 0, .12]);
}

function seededRandom(value) {
  let state = value >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hash(text) {
  return [...text].reduce((value, char) => ((value << 5) - value + char.charCodeAt(0)) | 0, 11) >>> 0;
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

export function createCinematicRenderer(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return { enabled: false, resize() {}, render() {} };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081914);
  scene.fog = new THREE.FogExp2(0x0b221c, 0.055);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(9, 8, 11);
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const hemisphere = new THREE.HemisphereLight(0xb5e7ff, 0x18331f, 1.65);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffe0a5, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  scene.add(sun);

  const target = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const agentMeshes = [];
  const wildlifeMeshes = [];
  let riverSurface = null;
  let signature = "";
  let width = 1;
  let height = 1;

  function mapPoint(x, y, snapshot) {
    return new THREE.Vector3((x / Math.max(1, snapshot.width) - 0.5) * 26, 0, (y / Math.max(1, snapshot.height) - 0.5) * 18);
  }

  function makeTree(random) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.62, 5), new THREE.MeshStandardMaterial({ color: 0x5a452d, roughness: 1 }));
    trunk.position.y = 0.31;
    trunk.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.32 + random() * 0.22, 1.18 + random() * 0.7, 6), new THREE.MeshStandardMaterial({ color: random() > 0.45 ? 0x376f47 : 0x4e864d, roughness: 1, flatShading: true }));
    canopy.position.y = 1.05;
    canopy.castShadow = true;
    tree.add(trunk, canopy);
    return tree;
  }

  function makeHouse(index, pigment) {
    const house = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.52, 0.64), new THREE.MeshStandardMaterial({ color: pigmentColor(mixPigments([pigment, [123, 82, 46]], [.55, .45])), roughness: 1 }));
    wall.position.y = 0.28;
    wall.castShadow = true;
    wall.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.64, 0.48, 4), new THREE.MeshStandardMaterial({ color: pigmentColor(mixPigments([pigment, [55, 39, 30]], [index % 3 ? .38 : .54, index % 3 ? .62 : .46])), roughness: 1, flatShading: true }));
    roof.rotation.y = Math.PI * 0.25;
    roof.position.y = 0.79;
    roof.castShadow = true;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.25, 0.02), new THREE.MeshStandardMaterial({ color: 0x241b14 }));
    door.position.set(0, 0.14, 0.331);
    house.add(wall, roof, door);
    return house;
  }

  function makeMountain(random) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(1.45 + random() * 1.55, 2.5 + random() * 3.4, 6),
      new THREE.MeshStandardMaterial({ color: random() > 0.5 ? 0x315c4c : 0x284b40, roughness: 1, flatShading: true })
    );
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    return mountain;
  }

  function makeCloud(random) {
    const cloud = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xc6e4d0, transparent: true, opacity: 0.2, roughness: 1, flatShading: true, depthWrite: false });
    for (let puff = 0; puff < 4; puff += 1) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.45 + random() * 0.45, 7, 5), material);
      sphere.position.set((puff - 1.5) * 0.48, random() * 0.2, (random() - 0.5) * 0.28);
      cloud.add(sphere);
    }
    return cloud;
  }

  function makeResident() {
    const resident = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xa8eb93, roughness: 0.85, flatShading: true });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.34, 5), bodyMaterial);
    body.position.y = 0.24;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf0c78e, roughness: 1, flatShading: true }));
    head.position.y = 0.48;
    head.castShadow = true;
    const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0xe3bc76, roughness: 1 }));
    bundle.position.set(0.13, 0.22, 0);
    bundle.visible = false;
    resident.add(body, head, bundle);
    resident.userData.body = body;
    resident.userData.bundle = bundle;
    return resident;
  }

  function makeWildlife(water) {
    const animal = new THREE.Mesh(new THREE.SphereGeometry(water ? 0.095 : 0.14, 7, 5), new THREE.MeshStandardMaterial({ color: water ? 0x70d2c9 : 0xc69558, roughness: 1, flatShading: true }));
    animal.scale.z = water ? 1.8 : 1.45;
    animal.castShadow = true;
    return animal;
  }

  function buildWorld(snapshot) {
    while (worldGroup.children.length) {
      const child = worldGroup.children.pop();
      disposeObject(child);
    }
    agentMeshes.length = 0;
    wildlifeMeshes.length = 0;
    const random = seededRandom(hash(snapshot.world.seed + ":" + snapshot.world.name));

    const ground = new THREE.PlaneGeometry(28, 20, 24, 16);
    const positions = ground.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      positions.setZ(index, Math.sin(x * 0.55) * 0.18 + Math.cos(y * 0.7) * 0.13 + (random() - 0.5) * 0.1);
    }
    ground.computeVertexNormals();
    ground.rotateX(-Math.PI / 2);
    const land = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ color: 0x2d5a37, roughness: 1, flatShading: true }));
    land.receiveShadow = true;
    worldGroup.add(land);

    const river = new THREE.Mesh(new THREE.PlaneGeometry(30, 2.45), new THREE.MeshStandardMaterial({ color: 0x297f83, roughness: 0.3, metalness: 0.08, transparent: true, opacity: 0.78 }));
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -0.31;
    river.position.set(-0.5, 0.025, 0.2);
    worldGroup.add(river);
    riverSurface = river;

    for (let mountainIndex = 0; mountainIndex < 11; mountainIndex += 1) {
      const mountain = makeMountain(random);
      mountain.position.set(-14 + mountainIndex * 2.7 + (random() - 0.5) * 1.2, 0.45, -8.2 - random() * 2.8);
      mountain.rotation.y = random() * Math.PI;
      worldGroup.add(mountain);
    }

    for (let cloudIndex = 0; cloudIndex < 5; cloudIndex += 1) {
      const cloud = makeCloud(random);
      cloud.position.set((random() - 0.5) * 25, 6.5 + random() * 3, -5 - random() * 5);
      cloud.scale.setScalar(0.7 + random() * 0.7);
      worldGroup.add(cloud);
    }

    for (let treeIndex = 0; treeIndex < 92; treeIndex += 1) {
      const tree = makeTree(random);
      tree.position.set((random() - 0.5) * 26, 0, (random() - 0.5) * 18);
      tree.rotation.y = random() * Math.PI;
      const scale = 0.72 + random() * 0.75;
      tree.scale.setScalar(scale);
      worldGroup.add(tree);
    }

    snapshot.world.settlements.forEach((settlement, settlementIndex) => {
      const point = mapPoint((settlement.x / 100) * snapshot.width, (settlement.y / 100) * snapshot.height, snapshot);
      const village = new THREE.Group();
      const completed = snapshot.works?.[settlementIndex]?.completed || 0;
      const pigment = settlementPigment(snapshot, settlementIndex);
      const buildings = Math.max(3, Math.min(8, 3 + Math.floor(settlement.population / 240) + completed));
      for (let buildingIndex = 0; buildingIndex < buildings; buildingIndex += 1) {
        const building = makeHouse(buildingIndex + settlementIndex, pigment);
        building.position.set(((buildingIndex % 3) - 1) * 0.78 + (random() - 0.5) * 0.2, 0, (Math.floor(buildingIndex / 3) - 0.5) * 0.86 + (random() - 0.5) * 0.2);
        building.rotation.y = random() * Math.PI;
        village.add(building);
      }
      const beacon = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: pigmentColor(pigment), transparent: true, opacity: 0.58 }));
      beacon.rotation.x = Math.PI / 2;
      beacon.position.y = 0.04;
      village.add(beacon);
      village.position.copy(point);
      worldGroup.add(village);
    });

    snapshot.world.settlements.forEach((settlement, index) => {
      const next = snapshot.world.settlements[(index + 1) % snapshot.world.settlements.length];
      const start = mapPoint((settlement.x / 100) * snapshot.width, (settlement.y / 100) * snapshot.height, snapshot);
      const end = mapPoint((next.x / 100) * snapshot.width, (next.y / 100) * snapshot.height, snapshot);
      const midpoint = start.clone().lerp(end, 0.5).add(new THREE.Vector3((random() - 0.5) * 1.4, 0.03, (random() - 0.5) * 1.4));
      const road = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start.setY(0.035), midpoint, end.setY(0.035)]), 20, 0.045, 5, false);
      worldGroup.add(new THREE.Mesh(road, new THREE.MeshStandardMaterial({ color: 0x93774c, roughness: 1 })));
    });

    snapshot.particles.forEach(() => {
      const resident = makeResident();
      worldGroup.add(resident);
      agentMeshes.push(resident);
    });
    snapshot.wildlife.forEach((animal) => {
      const mesh = makeWildlife(animal.habitat === "water");
      worldGroup.add(mesh);
      wildlifeMeshes.push(mesh);
    });
  }

  function resize() {
    const nextWidth = Math.max(1, canvas.clientWidth);
    const nextHeight = Math.max(1, canvas.clientHeight);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function render(snapshot, now) {
    resize();
    const completedWorks = (snapshot.works || []).map((work) => work.completed + ":" + (work.culturePigment || []).map((channel) => Math.round(channel / 20)).join("")).join(",");
    const nextSignature = snapshot.world.seed + ":" + snapshot.world.name + ":" + snapshot.world.settlements.length + ":" + snapshot.particles.length + ":" + completedWorks;
    if (nextSignature !== signature) {
      signature = nextSignature;
      buildWorld(snapshot);
    }

    snapshot.particles.forEach((particle, index) => {
      const mesh = agentMeshes[index];
      if (!mesh) return;
      const point = mapPoint(particle.x, particle.y, snapshot);
      mesh.position.set(point.x, 0.08, point.z);
      mesh.userData.body.material.color.copy(pigmentColor(residentPigment(particle, snapshot.world)));
      mesh.userData.bundle.visible = Boolean(particle.carrying);
      if (particle.carrying) mesh.userData.bundle.material.color.copy(pigmentColor(particle.carrying.pigment));
      mesh.rotation.y = Math.atan2(particle.vx || 0.001, particle.vy || 0.001);
    });
    snapshot.wildlife.forEach((animal, index) => {
      const mesh = wildlifeMeshes[index];
      if (!mesh) return;
      const point = mapPoint(animal.x, animal.y, snapshot);
      mesh.position.set(point.x, animal.habitat === "water" ? 0.09 : 0.12, point.z);
      mesh.rotation.y = Math.atan2(animal.vx || 0.001, animal.vy || 0.001);
    });

    const focus = snapshot.encounters.at(-1);
    const selected = snapshot.world.settlements[snapshot.selectedIndex] || snapshot.world.settlements[0];
    const focusPoint = focus ? mapPoint(focus.x, focus.y, snapshot) : mapPoint((selected.x / 100) * snapshot.width, (selected.y / 100) * snapshot.height, snapshot);
    target.lerp(focusPoint, 0.035);
    desiredCamera.set(focusPoint.x + 8.2, 7.2, focusPoint.z + 9.4);
    camera.position.lerp(desiredCamera, 0.024);
    camera.lookAt(target);

    const phase = (now / 50000) % 1;
    const sunlight = Math.max(0.08, Math.sin(phase * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
    sun.intensity = 0.4 + sunlight * 2.6;
    hemisphere.intensity = 0.55 + sunlight * 1.25;
    sun.position.set(Math.cos(phase * Math.PI * 2) * 13, 10 + sunlight * 10, Math.sin(phase * Math.PI * 2) * 10);
    if (riverSurface) {
      riverSurface.material.opacity = 0.54 + sunlight * 0.3;
      riverSurface.rotation.z = -0.31 + Math.sin(now / 5000) * 0.008;
    }
    scene.fog.density = snapshot.world.conditions.water > 72 ? 0.075 : 0.052;
    renderer.setClearColor(sunlight < 0.28 ? 0x071522 : 0x0a281f, 1);
    renderer.render(scene, camera);
  }

  return { enabled: true, resize, render };
}
