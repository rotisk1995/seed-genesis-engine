import { createCinematicRenderer } from "./cinematic.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

const palettes = ["#a8eb93", "#78e4db", "#c4a4f2", "#e3bc76", "#e88676"];

const initialWorld = {
  seed: "A river valley where memory becomes more valuable every winter.",
  name: "Asterra",
  era: "The First Thaw",
  turn: 1,
  summary: "A valley learning whether memory is inheritance, currency, or a burden.",
  insight: "A world becomes alive when its rules begin producing consequences no one explicitly designed.",
  pattern: "Memory commons",
  patternDetail: "Knowledge moves along the river more reliably than goods.",
  conditions: { water: 68, abundance: 61, cohesion: 52, mystery: 72 },
  traces: [
    { turn: 1, source: "Initial condition", action: "Memory gains material value", effect: "Knowledge begins moving through the valley as a shared resource." }
  ],
  settlements: [
    { name: "Velis", biome: "Glasswater delta", trait: "River archivists who trade in recovered names.", population: 820, stability: 72, x: 31, y: 54, relation: "shares records with Orra" },
    { name: "Orra", biome: "Reed-crown floodplain", trait: "Boatwrights who believe a journey can change the past.", population: 510, stability: 62, x: 57, y: 33, relation: "depends on Velis for maps" },
    { name: "Thornwake", biome: "Northwood margin", trait: "Moss farmers who store songs in the soil.", population: 390, stability: 77, x: 69, y: 66, relation: "protects the headwater paths" },
    { name: "Mira", biome: "Stone lantern ridge", trait: "Weather readers who tax every promise made at dawn.", population: 280, stability: 51, x: 43, y: 76, relation: "mediates debts between villages" }
  ],
  factions: [
    { name: "The Keepers of Echo", goal: "Make memory a shared public resource.", influence: 69 },
    { name: "The Winter Ledger", goal: "Measure memory, scarcity, and debt.", influence: 54 },
    { name: "Rootbound Chorus", goal: "Let the valley’s living systems speak for themselves.", influence: 41 }
  ],
  agents: [
    { name: "Elara", role: "forager", home: "Velis", focus: "reads the river’s edible margins", needs: { food: 74, shelter: 63, belonging: 57, wonder: 84 } },
    { name: "Torin", role: "carpenter", home: "Orra", focus: "repairs boats after listening to their grain", needs: { food: 65, shelter: 78, belonging: 46, wonder: 51 } },
    { name: "Mira", role: "trader", home: "Mira", focus: "barters promises between settlements", needs: { food: 68, shelter: 59, belonging: 81, wonder: 62 } },
    { name: "Lio", role: "storykeeper", home: "Velis", focus: "collects memories that no ledger will hold", needs: { food: 51, shelter: 52, belonging: 73, wonder: 88 } },
    { name: "Arden", role: "pathfinder", home: "Thornwake", focus: "maps changes that arrive before sunrise", needs: { food: 77, shelter: 44, belonging: 58, wonder: 79 } }
  ],
  events: [
    { turn: 1, title: "The first remembering", detail: "A child in Velis recites a shipwreck no living witness has seen. Three families claim the memory, and the river market closes to listen.", icon: "✦", color: "#a8eb93" },
    { turn: 1, title: "Reeds become ledgers", detail: "Orra begins knotting debts into reed bundles. The practice makes trade easier—and forgiveness more difficult.", icon: "⌁", color: "#78e4db" },
    { turn: 1, title: "The ridge keeps quiet", detail: "Mira’s weather readers notice that forgotten names attract rain. They have not told the floodplain yet.", icon: "◌", color: "#c4a4f2" }
  ]
};

let world = structuredClone(initialWorld);
let selectedIndex = 0;
let busy = false;

function hash(text) {
  return [...text].reduce((value, char) => ((value << 5) - value + char.charCodeAt(0)) | 0, 11) >>> 0;
}

function pick(items, value) {
  return items[value % items.length];
}

function makeAgents(settlements, key) {
  const names = ["Elara", "Torin", "Mira", "Lio", "Arden", "Sana", "Vey", "Iri"];
  const roles = ["forager", "carpenter", "trader", "storykeeper", "pathfinder", "mediator", "watcher", "gardener"];
  const focuses = ["follows a pattern no one else believes", "repairs the shared tools", "trades what cannot be measured", "keeps memories from drifting apart", "searches for the next safe crossing", "turns arguments into rituals", "records small ecological changes", "grows food where it should not grow"];
  return [0, 1, 2, 3, 4].map((index) => ({
    name: pick(names, key + index * 11),
    role: pick(roles, key + index * 3),
    home: settlements[index % settlements.length].name,
    focus: pick(focuses, key + index * 5),
    needs: {
      food: 42 + ((key >> (index + 1)) % 48), shelter: 42 + ((key >> (index + 4)) % 49),
      belonging: 42 + ((key >> (index + 7)) % 49), wonder: 42 + ((key >> (index + 10)) % 49)
    }
  }));
}

function normaliseAgents(agents, settlements, key) {
  const generated = makeAgents(settlements, key);
  if (!Array.isArray(agents) || !agents.length) return generated;
  return agents.map((agent, index) => {
    const fallback = generated[index % generated.length];
    const home = settlements.some((settlement) => settlement.name === agent.home) ? agent.home : settlements[index % settlements.length].name;
    return { ...fallback, ...agent, home, needs: { ...fallback.needs, ...(agent.needs || {}) } };
  });
}

function fallbackWorld(seed) {
  const key = hash(seed.toLowerCase());
  const hasWater = /river|sea|tide|ocean|rain|flood|water/.test(seed.toLowerCase());
  const hasForest = /forest|tree|root|wood|moss|green/.test(seed.toLowerCase());
  const hasLight = /light|sun|moon|star|glow|fire/.test(seed.toLowerCase());
  const names = ["Asterra", "Lumenfall", "Varrow", "Tethys", "Orynth", "Mireva", "Caldrin"];
  const biomes = hasWater ? ["Tidal glassland", "Salt reed basin", "Headwater terraces", "Mist estuary"] : hasForest ? ["Listening canopy", "Root lantern grove", "Fernstone verge", "Mosswind vale"] : hasLight ? ["Dawnward plain", "Ember ridge", "Lantern heath", "Pale observatory"] : ["Wind-scarp valley", "Amber pasture", "Lichen ridge", "Quiet marsh"];
  const traits = ["Maps the invisible currents between communities.", "Builds rituals around the resource everyone needs.", "Protects a practice the other settlements misunderstand.", "Trades a local abundance for distant safety."];
  const settlementNames = ["Velis", "Orra", "Thornwake", "Mira", "Calen", "Iria", "Sablet"];
  const title = pick(names, key);
  const summary = hasWater ? "A people shaped by a shifting waterline, learning that every tide redistributes more than land." : hasForest ? "A living canopy responds to human choices, making honesty and survival newly entangled." : hasLight ? "Communities follow a source of light whose migration has begun to alter their values." : "Communities discover that one small rule has rearranged what they owe one another.";
  const settlements = [0, 1, 2, 3].map((index) => ({
    name: pick(settlementNames, key + index * 3),
    biome: biomes[index],
    trait: traits[index],
    population: 230 + ((key >> (index * 3)) % 650),
    stability: 48 + ((key >> (index * 5)) % 35),
    x: [27, 59, 73, 45][index] + ((key >> index) % 5),
    y: [51, 30, 65, 77][index] - ((key >> (index + 4)) % 4),
    relation: index === 0 ? "anchors the shared exchange" : index === 1 ? "tests the old agreements" : index === 2 ? "guards the slow resources" : "translates between rivals"
  }));
  return {
    seed, name: title, era: pick(["The First Unfolding", "The Quiet Adjustment", "The Season of Witness", "The Long Becoming"], key), turn: 1,
    summary, insight: "The initial rule is only a seed. Its meaning emerges from the ways different communities adapt to it.",
    pattern: pick(["Mutual dependence", "Ritual economy", "Distributed memory", "Ecological covenant"], key),
    patternDetail: "A local adaptation is becoming a system-wide expectation.",
    conditions: { water: hasWater ? 76 : 52 + (key % 23), abundance: 49 + ((key >> 3) % 32), cohesion: 43 + ((key >> 5) % 38), mystery: 60 + ((key >> 9) % 31) },
    traces: [
      { turn: 1, source: "Initial condition", action: seed, effect: "Communities adapt differently, creating the first divergence." }
    ],
    settlements,
    factions: [
      { name: "The Common Thread", goal: "Keep the new condition shared and legible.", influence: 61 },
      { name: "The Stewards of Before", goal: "Protect the agreements that existed before the change.", influence: 49 },
      { name: "The Unmapped", goal: "Follow the consequences beyond any settlement’s control.", influence: 38 }
    ],
    agents: normaliseAgents([], settlements, key),
    events: [
      { turn: 1, title: "A condition takes root", detail: `The world begins with one pressure: ${seed}`, icon: "✦", color: "#a8eb93" },
      { turn: 1, title: "The first adaptation", detail: `${settlements[0].name} changes a daily ritual to survive it. Other settlements cannot agree whether this is wisdom or theft.`, icon: "⌁", color: "#78e4db" },
      { turn: 1, title: "An unanswered signal", detail: `${settlements[2].name} notices an ecological response that no one has yet explained.`, icon: "◌", color: "#c4a4f2" }
    ]
  };
}

function normaliseLiveWorld(data, seed) {
  if (!data?.name || !Array.isArray(data.settlements)) return fallbackWorld(seed);
  const fallback = fallbackWorld(seed);
  const settlements = data.settlements.map((settlement, index) => ({ ...fallback.settlements[index % fallback.settlements.length], ...settlement, relation: fallback.settlements[index % fallback.settlements.length].relation }));
  return {
    ...fallback,
    ...data,
    seed,
    turn: 1,
    pattern: "Causal divergence",
    patternDetail: data.insight,
    conditions: fallback.conditions,
    settlements,
    agents: normaliseAgents(data.agents, settlements, hash(seed)),
    events: data.events.map((event, index) => ({ ...event, turn: 1, icon: ["✦", "⌁", "◌", "↗"][index], color: palettes[index] }))
  };
}

function renderConditions() {
  const labels = { water: "water", abundance: "abundance", cohesion: "cohesion", mystery: "mystery" };
  $("#conditionList").innerHTML = Object.entries(world.conditions).map(([key, value]) => `<div class="condition-row"><span>${labels[key]}</span><i><b style="width:${value}%"></b></i><em>${value}</em></div>`).join("");
}

function addTrace(source, action, effect) {
  world.traces = [...(world.traces || []), { turn: world.turn, source, action, effect }].slice(-4);
}

function renderTrace() {
  $("#causalTrace").innerHTML = (world.traces || []).slice().reverse().map((trace) => '<div class="trace-row"><span class="trace-turn">T' + String(trace.turn).padStart(2, "0") + '</span><div><b>' + esc(trace.source) + '</b><p>' + esc(trace.action) + '</p><small>' + esc(trace.effect) + '</small></div></div>').join("");
}

const needColors = { food: "#a8eb93", shelter: "#78e4db", belonging: "#c4a4f2", wonder: "#e3bc76" };
const ecosystem = { canvas: null, context: null, width: 0, height: 0, terrain: null, particles: [], wildlife: [], encounters: [], exchanges: 0, deliveries: 0, settlementWorks: [], lastCommittedExchanges: 0, lastCommittedDeliveries: 0, lastCommittedConstruction: 0, lastFrame: 0, lastReadout: 0, running: false, reducedMotion: false, camera: { x: 0, y: 0, zoom: 1.16, focus: "" } };
let cinematic = null;
const useCinematicWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";

function fieldSites() {
  return [
    { need: "food", x: 18 + world.conditions.water * 0.08, y: 57, label: "reed fields" },
    { need: "food", x: 72, y: 31 + (100 - world.conditions.water) * 0.06, label: "orchard" },
    { need: "shelter", x: 29, y: 24, label: "timber stand" },
    { need: "belonging", x: 62, y: 56, label: "shared hearth" },
    { need: "wonder", x: 51, y: 18 + world.conditions.mystery * 0.05, label: "standing stones" },
    { need: "wonder", x: 79, y: 72, label: "old observatory" }
  ];
}

function worldPointToScreen(x, y) {
  return {
    x: ecosystem.width / 2 + (x - ecosystem.camera.x) * ecosystem.camera.zoom,
    y: ecosystem.height / 2 + (y - ecosystem.camera.y) * ecosystem.camera.zoom * 0.72
  };
}

function applyCameraTransform(context) {
  context.translate(ecosystem.width / 2, ecosystem.height / 2);
  context.scale(ecosystem.camera.zoom, ecosystem.camera.zoom * 0.72);
  context.translate(-ecosystem.camera.x, -ecosystem.camera.y);
}

function currentWeather() {
  if (world.conditions.water < 38) return "dry wind";
  if (world.conditions.water > 78) return "river mist";
  if (world.conditions.mystery > 78) return "silver haze";
  return "clear air";
}

function updateCinematicCamera(now) {
  const encounter = ecosystem.encounters.at(-1);
  const selected = world.settlements[selectedIndex] || world.settlements[0];
  const targetX = encounter ? encounter.x : (selected.x / 100) * ecosystem.width;
  const targetY = encounter ? encounter.y : (selected.y / 100) * ecosystem.height;
  ecosystem.camera.x += (targetX - ecosystem.camera.x) * 0.022;
  ecosystem.camera.y += (targetY - ecosystem.camera.y) * 0.022;
  ecosystem.camera.zoom += ((encounter ? 1.29 : 1.16) - ecosystem.camera.zoom) * 0.014;
  ecosystem.camera.focus = encounter ? "following a resident encounter" : "observing " + selected.name;
  if (now - ecosystem.lastReadout > 550) {
    const phase = (now / 50000) % 1;
    const time = phase < 0.2 || phase > 0.84 ? "nightfall" : phase < 0.33 ? "dawn" : phase > 0.68 ? "golden hour" : "daylight";
    $("#cameraFocus").textContent = time + " / " + currentWeather() + " / " + ecosystem.camera.focus;
  }
}

function seededRandom(value) {
  let state = value >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function rebuildTerrainLayer() {
  if (!ecosystem.width || !ecosystem.height) return;
  const density = Math.min(window.devicePixelRatio || 1, 2);
  const terrain = document.createElement("canvas");
  terrain.width = Math.round(ecosystem.width * density);
  terrain.height = Math.round(ecosystem.height * density);
  const context = terrain.getContext("2d");
  context.setTransform(density, 0, 0, density, 0, 0);
  const random = seededRandom(hash(world.seed + ":" + world.name));
  const width = ecosystem.width;
  const height = ecosystem.height;

  for (let layer = 0; layer < 10; layer += 1) {
    context.fillStyle = layer % 2 ? "rgba(125,174,113,.042)" : "rgba(44,112,97,.052)";
    context.beginPath();
    context.ellipse(random() * width, random() * height, width * (0.13 + random() * 0.18), height * (0.05 + random() * 0.09), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  for (let ridge = 0; ridge < 3; ridge += 1) {
    const base = height * (0.08 + ridge * 0.12);
    context.fillStyle = ridge === 0 ? "rgba(30,74,63,.25)" : "rgba(39,91,68,.17)";
    context.beginPath();
    context.moveTo(-20, base + 38);
    for (let peak = 0; peak < 8; peak += 1) {
      const x = (peak / 7) * (width + 40) - 20;
      const y = base - (18 + random() * 56) + Math.sin(peak * 1.7 + ridge) * 14;
      context.lineTo(x, y);
    }
    context.lineTo(width + 20, base + 42);
    context.closePath();
    context.fill();
  }

  context.lineCap = "round";
  for (let contour = 0; contour < 13; contour += 1) {
    const y = height * (0.05 + contour * 0.075) + (random() - 0.5) * 38;
    context.strokeStyle = "rgba(168,235,147," + (0.045 + random() * 0.045) + ")";
    context.lineWidth = 0.7 + random() * 0.7;
    context.beginPath();
    context.moveTo(-20, y);
    context.bezierCurveTo(width * 0.22, y - 55 + random() * 110, width * 0.66, y + (random() - 0.5) * 100, width + 20, y + (random() - 0.5) * 85);
    context.stroke();
  }

  context.strokeStyle = "rgba(87,209,207,.18)";
  context.lineWidth = 21;
  context.beginPath();
  context.moveTo(width * 0.02, height * 0.2);
  context.bezierCurveTo(width * 0.18, height * 0.35, width * 0.3, height * 0.14, width * 0.48, height * 0.47);
  context.bezierCurveTo(width * 0.61, height * 0.72, width * 0.76, height * 0.58, width * 1.02, height * 0.86);
  context.stroke();
  context.strokeStyle = "rgba(187,255,239,.23)";
  context.lineWidth = 3.5;
  context.stroke();

  for (let tree = 0; tree < 165; tree += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 2 + random() * 6;
    context.fillStyle = "rgba(3,21,16,.2)";
    context.beginPath(); context.ellipse(x + radius * 0.7, y + radius * 0.8, radius * 1.15, radius * 0.45, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(75,67,39,.28)";
    context.fillRect(x - .65, y - radius * .05, 1.3, radius * 1.5);
    context.fillStyle = tree % 3 ? "rgba(61,125,82,.24)" : "rgba(120,181,91,.19)";
    context.beginPath(); context.arc(x, y - radius * .3, radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(150,211,106,.07)";
    context.beginPath(); context.arc(x - radius * .28, y - radius * .58, radius * .46, 0, Math.PI * 2); context.fill();
  }

  context.setLineDash([3, 7]);
  context.strokeStyle = "rgba(232,202,126,.2)";
  context.lineWidth = 1.1;
  world.settlements.forEach((settlement, index) => {
    const next = world.settlements[(index + 1) % world.settlements.length];
    context.beginPath();
    context.moveTo((settlement.x / 100) * width, (settlement.y / 100) * height);
    context.quadraticCurveTo(((settlement.x + next.x) / 200) * width, ((settlement.y + next.y) / 200) * height - 18, (next.x / 100) * width, (next.y / 100) * height);
    context.stroke();
  });
  context.setLineDash([]);

  ecosystem.terrain = terrain;
}

function updateEcosystemReadout() {
  const status = $("#mapStatus");
  if (!status) return;
  if (!ecosystem.particles.length) {
    status.textContent = world.settlements.length + " settlements / " + world.factions.length + " pressures / " + world.turn + " turns observed";
    return;
  }
  const structures = ecosystem.settlementWorks.reduce((sum, work) => sum + work.completed, 0);
  status.textContent = ecosystem.particles.length + " residents / " + ecosystem.deliveries + " deliveries / " + structures + " structures / turn " + world.turn;
}

function resizeEcosystem() {
  if (!ecosystem.canvas || !ecosystem.context) return;
  const bounds = ecosystem.canvas.getBoundingClientRect();
  const density = Math.min(window.devicePixelRatio || 1, 2);
  ecosystem.width = Math.max(1, bounds.width);
  ecosystem.height = Math.max(1, bounds.height);
  ecosystem.canvas.width = Math.round(ecosystem.width * density);
  ecosystem.canvas.height = Math.round(ecosystem.height * density);
  ecosystem.context.setTransform(density, 0, 0, density, 0, 0);
  rebuildTerrainLayer();
  cinematic?.resize();
}

function resetEcosystem() {
  if (!ecosystem.canvas || !world.settlements.length) return;
  resizeEcosystem();
  const population = world.settlements.reduce((sum, settlement) => sum + settlement.population, 0);
  const residentCount = Math.min(72, Math.max(48, Math.round(population / 36)));
  ecosystem.particles = Array.from({ length: residentCount }, (_, index) => {
    const agentIndex = index % Math.max(1, world.agents.length);
    const agent = world.agents[agentIndex] || {};
    const namedHome = world.settlements.findIndex((settlement) => settlement.name === agent.home);
    const homeIndex = namedHome >= 0 ? namedHome : index % world.settlements.length;
    const home = world.settlements[homeIndex];
    const seed = hash(world.seed + ":" + index);
    const angle = (seed % 628) / 100;
    const radius = 6 + (seed % 160) / 14;
    const x = (home.x / 100) * ecosystem.width + Math.cos(angle) * radius;
    const y = (home.y / 100) * ecosystem.height + Math.sin(angle) * radius;
    const baseNeeds = agent.needs || { food: 60, shelter: 60, belonging: 60, wonder: 60 };
    const needs = Object.fromEntries(Object.entries(baseNeeds).map(([need, value], needIndex) => [need, clamp(value + ((seed >> (needIndex * 3)) % 19) - 9, 8, 100)]));
    return { seed, agentIndex, homeIndex, phase: (seed % 12) / 12, x, y, vx: 0, vy: 0, tail: [{ x, y }], needs, memories: 0, ties: {}, carrying: null, deliveries: 0, activity: "belonging", urgency: 0.5, lastNeedTick: performance.now(), lastEncounter: performance.now() + (seed % 1100), lastGather: 0, lastDelivery: 0 };
  });
  ecosystem.wildlife = Array.from({ length: 15 }, (_, index) => {
    const seed = hash(world.seed + ":wildlife:" + index);
    const habitat = index % 3 === 0 ? "water" : "forest";
    const x = (habitat === "water" ? 16 + (seed % 63) : 9 + (seed % 83)) / 100 * ecosystem.width;
    const y = (habitat === "water" ? 31 + ((seed >> 6) % 47) : 12 + ((seed >> 5) % 75)) / 100 * ecosystem.height;
    return { seed, habitat, x, y, vx: 0, vy: 0, phase: (seed % 17) / 17 };
  });
  const selected = world.settlements[selectedIndex] || world.settlements[0];
  ecosystem.camera = { x: (selected.x / 100) * ecosystem.width, y: (selected.y / 100) * ecosystem.height, zoom: 1.16, focus: "observing " + selected.name };
  ecosystem.encounters = [];
  ecosystem.exchanges = 0;
  ecosystem.deliveries = 0;
  ecosystem.settlementWorks = world.settlements.map((settlement, index) => ({
    grain: 0,
    timber: Math.max(0, Math.floor((64 - settlement.stability) / 11)),
    progress: index === 0 ? 0.16 : 0,
    completed: 0
  }));
  ecosystem.lastCommittedExchanges = 0;
  ecosystem.lastCommittedDeliveries = 0;
  ecosystem.lastCommittedConstruction = 0;
  ecosystem.lastReadout = 0;
  updateEcosystemReadout();
}

function particleTarget(particle, now) {
  const [need, value] = Object.entries(particle.needs).sort(([, a], [, b]) => a - b)[0];
  const home = world.settlements[particle.homeIndex % world.settlements.length];
  const neighbour = world.settlements[(particle.homeIndex + 1 + (particle.seed % Math.max(1, world.settlements.length - 1))) % world.settlements.length];
  if (particle.carrying) {
    return {
      need: particle.carrying === "grain" ? "food" : "shelter",
      urgency: (100 - value) / 100,
      x: (home.x / 100) * ecosystem.width,
      y: (home.y / 100) * ecosystem.height,
      mode: "deliver",
      resource: particle.carrying
    };
  }
  const travelling = Math.floor(now / 2800 + particle.phase) % 2 === 0;
  const sites = fieldSites();
  let destination = home;
  let mode = "restore";
  let resource = null;
  const foodSites = sites.filter((site) => site.need === "food");
  const shelterSites = sites.filter((site) => site.need === "shelter");
  const belongingSites = sites.filter((site) => site.need === "belonging");
  const wonderSites = sites.filter((site) => site.need === "wonder");
  if (need === "food") { destination = travelling ? foodSites[particle.seed % foodSites.length] : home; mode = travelling ? "gather" : "restore"; resource = "grain"; }
  if (need === "shelter") { destination = travelling ? shelterSites[0] : home; mode = travelling ? "gather" : "restore"; resource = "timber"; }
  if (need === "belonging") destination = travelling ? belongingSites[0] : neighbour;
  if (need === "wonder") destination = wonderSites[particle.seed % wonderSites.length];
  const sway = Math.sin(now / 850 + particle.phase * 7) * 1.6;
  return { need, urgency: (100 - value) / 100, x: ((destination.x + sway) / 100) * ecosystem.width, y: ((destination.y + Math.cos(now / 1000 + particle.phase * 9) * 1.3) / 100) * ecosystem.height, mode, resource };
}

function updateEcosystem(now) {
  const dt = Math.min(2, Math.max(0.4, (now - (ecosystem.lastFrame || now)) / 16.67));
  ecosystem.lastFrame = now;
  ecosystem.particles.forEach((particle) => {
    const elapsed = Math.max(0, (now - particle.lastNeedTick) / 1000);
    if (elapsed > 0.65) {
      particle.needs.food = Math.max(8, particle.needs.food - elapsed * 0.7);
      particle.needs.shelter = Math.max(8, particle.needs.shelter - elapsed * 0.24);
      particle.needs.belonging = Math.max(8, particle.needs.belonging - elapsed * 0.34);
      particle.needs.wonder = Math.max(8, particle.needs.wonder - elapsed * 0.16);
      particle.lastNeedTick = now;
    }
    const target = particleTarget(particle, now);
    const dx = target.x - particle.x;
    const dy = target.y - particle.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const force = 0.028 + target.urgency * 0.062;
    particle.vx = (particle.vx + (dx / distance) * force * dt) * 0.91;
    particle.vy = (particle.vy + (dy / distance) * force * dt) * 0.91;
    particle.x = Math.max(8, Math.min(ecosystem.width - 8, particle.x + particle.vx * dt));
    particle.y = Math.max(8, Math.min(ecosystem.height - 8, particle.y + particle.vy * dt));
    particle.activity = target.need;
    particle.urgency = target.urgency;
    if (distance < 14) {
      if (target.mode === "gather" && !particle.carrying && now - particle.lastGather > 650) {
        particle.carrying = target.resource;
        particle.lastGather = now;
      } else if (target.mode === "deliver" && particle.carrying && now - particle.lastDelivery > 650) {
        const work = ecosystem.settlementWorks[particle.homeIndex];
        if (work) {
          if (particle.carrying === "grain") {
            work.grain = Math.min(18, work.grain + 1);
            particle.needs.food = Math.min(100, particle.needs.food + 16);
          } else {
            work.timber += 1;
            work.progress += 0.13;
            particle.needs.shelter = Math.min(100, particle.needs.shelter + 13);
            if (work.progress >= 1) {
              work.completed += 1;
              work.progress = 0;
              work.timber = 0;
            }
          }
        }
        ecosystem.deliveries += 1;
        particle.deliveries += 1;
        particle.carrying = null;
        particle.lastDelivery = now;
      } else if (target.mode === "restore") {
        particle.needs[target.need] = Math.min(100, particle.needs[target.need] + (target.need === "belonging" ? 0.75 : 0.52) * dt);
        if (target.need === "wonder") particle.memories += 0.01 * dt;
      }
    }
    const previous = particle.tail.at(-1);
    if (!previous || Math.hypot(previous.x - particle.x, previous.y - particle.y) > 2.4) particle.tail.push({ x: particle.x, y: particle.y });
    if (particle.tail.length > 9) particle.tail.shift();
  });
  ecosystem.wildlife.forEach((animal) => {
    const drift = animal.habitat === "water" ? 0.025 : 0.018;
    const direction = now / 1800 + animal.phase * 9;
    animal.vx = (animal.vx + Math.cos(direction) * drift * dt) * 0.94;
    animal.vy = (animal.vy + Math.sin(direction * 0.73) * drift * dt) * 0.94;
    animal.x = Math.max(8, Math.min(ecosystem.width - 8, animal.x + animal.vx * dt));
    animal.y = Math.max(8, Math.min(ecosystem.height - 8, animal.y + animal.vy * dt));
  });
  let newEncounters = 0;
  for (let first = 0; first < ecosystem.particles.length; first += 1) {
    for (let second = first + 1; second < ecosystem.particles.length; second += 1) {
      const a = ecosystem.particles[first];
      const b = ecosystem.particles[second];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 18 && distance > 0.1) {
        const repel = ((18 - distance) / 18) * 0.022 * dt;
        a.vx -= (dx / distance) * repel; a.vy -= (dy / distance) * repel;
        b.vx += (dx / distance) * repel; b.vy += (dy / distance) * repel;
      }
      if (newEncounters < 2 && distance < 9 && a.homeIndex !== b.homeIndex && now - a.lastEncounter > 1000 && now - b.lastEncounter > 1000) {
        const color = a.activity === b.activity ? needColors[a.activity] : needColors.belonging;
        ecosystem.encounters.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, born: now, color });
        ecosystem.exchanges += 1;
        a.memories += 1; b.memories += 1;
        a.needs.belonging = Math.min(100, a.needs.belonging + 14);
        b.needs.belonging = Math.min(100, b.needs.belonging + 14);
        a.ties[b.homeIndex] = (a.ties[b.homeIndex] || 0) + 1;
        b.ties[a.homeIndex] = (b.ties[a.homeIndex] || 0) + 1;
        a.lastEncounter = now; b.lastEncounter = now; newEncounters += 1;
      }
    }
  }
  ecosystem.encounters = ecosystem.encounters.filter((encounter) => now - encounter.born < 1400);
}

function drawResourceSite(context, site, now, nightStrength) {
  const x = (site.x / 100) * ecosystem.width;
  const y = (site.y / 100) * ecosystem.height;
  const color = needColors[site.need];
  const pulse = 0.5 + Math.sin(now / 700 + x * .08 + y * .04) * 0.5;
  const glow = context.createRadialGradient(x, y, 1, x, y, 30 + pulse * 7);
  glow.addColorStop(0, color + "42");
  glow.addColorStop(1, color + "00");
  context.fillStyle = glow;
  context.beginPath(); context.arc(x, y, 31 + pulse * 6, 0, Math.PI * 2); context.fill();

  if (site.need === "food") {
    context.strokeStyle = "rgba(187,221,113,.38)";
    context.lineWidth = 1.2;
    for (let row = -2; row <= 2; row += 1) {
      context.beginPath();
      context.moveTo(x - 11, y + row * 3);
      context.quadraticCurveTo(x, y + row * 3 - 2, x + 11, y + row * 3);
      context.stroke();
    }
    context.fillStyle = "rgba(218,187,95,.72)";
    for (let grain = 0; grain < 8; grain += 1) {
      context.beginPath(); context.ellipse(x - 10 + grain * 2.8, y - 5 + Math.sin(grain * 2) * 3, 1.1, 2, .4, 0, Math.PI * 2); context.fill();
    }
  } else if (site.need === "shelter") {
    context.fillStyle = "rgba(82,63,38,.78)";
    for (let log = 0; log < 4; log += 1) {
      context.save(); context.translate(x - 8 + log * 5, y + (log % 2) * 3); context.rotate(.34); context.fillRect(-5, -1.6, 10, 3.2); context.restore();
    }
    context.fillStyle = "rgba(95,165,103,.58)";
    for (let tree = 0; tree < 3; tree += 1) {
      context.beginPath(); context.arc(x - 9 + tree * 9, y - 8 - (tree % 2) * 3, 4.2, 0, Math.PI * 2); context.fill();
    }
  } else if (site.need === "belonging") {
    context.fillStyle = "rgba(75,52,35,.78)";
    context.beginPath(); context.arc(x, y + 4, 7, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(255,189,98," + (0.52 + nightStrength * .36) + ")";
    context.beginPath(); context.arc(x, y, 3.5 + pulse, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "rgba(201,175,119,.65)";
    context.lineWidth = 1.2;
    for (let seat = 0; seat < 4; seat += 1) {
      const angle = seat * Math.PI / 2 + .4;
      context.beginPath(); context.arc(x + Math.cos(angle) * 10, y + Math.sin(angle) * 7, 2.5, 0, Math.PI * 2); context.stroke();
    }
  } else {
    context.strokeStyle = "rgba(213,195,238,.67)";
    context.lineWidth = 1.5;
    for (let stone = 0; stone < 5; stone += 1) {
      const angle = stone * Math.PI * 2 / 5;
      context.save(); context.translate(x + Math.cos(angle) * 8, y + Math.sin(angle) * 6); context.rotate(angle); context.strokeRect(-1.8, -4, 3.6, 8); context.restore();
    }
    context.beginPath(); context.arc(x, y, 4 + pulse * 1.5, 0, Math.PI * 2); context.stroke();
  }
}

function drawVillage(context, settlement, index, nightStrength) {
  const x = (settlement.x / 100) * ecosystem.width;
  const y = (settlement.y / 100) * ecosystem.height;
  const work = ecosystem.settlementWorks[index] || { grain: 0, timber: 0, progress: 0, completed: 0 };
  const buildingCount = Math.max(2, Math.min(8, 2 + Math.floor(settlement.population / 260) + work.completed));
  context.fillStyle = "rgba(0,0,0,.25)";
  context.beginPath(); context.ellipse(x, y + 8, 27, 10, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "rgba(190,157,94,.24)";
  context.lineWidth = 1;
  context.beginPath(); context.ellipse(x, y + 3, 29, 13, 0, 0, Math.PI * 2); context.stroke();
  for (let building = 0; building < buildingCount; building += 1) {
    const offsetX = ((building % 3) - 1) * 11 + (Math.floor(building / 3) ? 7 : 0);
    const offsetY = (Math.floor(building / 3) - 0.5) * 11;
    const scale = 0.75 + ((hash(settlement.name + building) % 8) / 20);
    context.fillStyle = "rgba(108,83,51,.86)";
    context.fillRect(x + offsetX - 5 * scale, y + offsetY - 1, 10 * scale, 7 * scale);
    context.fillStyle = index % 2 ? "rgba(73,56,40,.96)" : "rgba(91,65,43,.96)";
    context.beginPath();
    context.moveTo(x + offsetX - 7 * scale, y + offsetY - 1);
    context.lineTo(x + offsetX, y + offsetY - 9 * scale);
    context.lineTo(x + offsetX + 7 * scale, y + offsetY - 1);
    context.closePath(); context.fill();
    context.fillStyle = "rgba(36,25,18,.82)";
    context.fillRect(x + offsetX - scale, y + offsetY + 2, 2 * scale, 4 * scale);
    if (building % 2 === 0) {
      context.fillStyle = "rgba(52,43,34,.82)";
      context.fillRect(x + offsetX + 3 * scale, y + offsetY - 8 * scale, 1.6, 5.5 * scale);
      context.fillStyle = "rgba(211,225,205,.14)";
      context.beginPath(); context.arc(x + offsetX + 4 * scale, y + offsetY - 10 * scale, 2.7, 0, Math.PI * 2); context.fill();
    }
    if (nightStrength > 0.22) {
      context.fillStyle = "rgba(255,210,116," + (0.35 + nightStrength * 0.55) + ")";
      context.fillRect(x + offsetX - scale, y + offsetY + 2, 2 * scale, 2 * scale);
    }
  }
  context.strokeStyle = palettes[index % palettes.length] + "86";
  context.lineWidth = 1.1;
  context.beginPath(); context.arc(x, y, 18 + settlement.stability * 0.08, 0, Math.PI * 2); context.stroke();
  if (work.grain) {
    context.fillStyle = "rgba(215,181,99,.66)";
    for (let crate = 0; crate < Math.min(3, Math.ceil(work.grain / 5)); crate += 1) context.fillRect(x - 23 + crate * 4, y + 13, 3, 3);
  }
  if (work.progress > 0.02) {
    const siteX = x + 25;
    const siteY = y + 10;
    context.fillStyle = "rgba(61,45,29,.5)";
    context.fillRect(siteX - 8, siteY - 3, 16, 6);
    context.strokeStyle = "rgba(206,174,111,.82)";
    context.lineWidth = 1.35;
    context.beginPath();
    context.moveTo(siteX - 8, siteY + 4); context.lineTo(siteX - 6, siteY - 14 - work.progress * 9);
    context.moveTo(siteX + 8, siteY + 4); context.lineTo(siteX + 6, siteY - 14 - work.progress * 9);
    context.moveTo(siteX - 6, siteY - 8); context.lineTo(siteX + 6, siteY - 8);
    context.moveTo(siteX - 7, siteY - 2); context.lineTo(siteX + 7, siteY - 2);
    context.stroke();
    context.fillStyle = "rgba(168,235,147," + (.25 + work.progress * .35) + ")";
    context.fillRect(siteX - 5, siteY - 6 - work.progress * 6, 10, 4 + work.progress * 6);
  }
}

function drawResidentSprite(context, particle) {
  const color = needColors[particle.activity];
  const size = 2.3 + particle.urgency * 1.5;
  const stride = Math.sin((particle.x + particle.y) * .42 + particle.phase * 8) * size * .6;
  context.fillStyle = "rgba(0,0,0,.3)";
  context.beginPath(); context.ellipse(particle.x, particle.y + size * 1.15, size * 1.2, size * 0.43, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = color;
  context.lineWidth = 1.35;
  context.beginPath(); context.moveTo(particle.x, particle.y - size * 0.45); context.lineTo(particle.x, particle.y + size * 0.9); context.stroke();
  context.strokeStyle = "rgba(229,235,217,.5)";
  context.lineWidth = 1;
  context.beginPath(); context.moveTo(particle.x, particle.y + size * .72); context.lineTo(particle.x - stride, particle.y + size * 1.2); context.moveTo(particle.x, particle.y + size * .72); context.lineTo(particle.x + stride, particle.y + size * 1.2); context.stroke();
  context.fillStyle = "#f4d7a0";
  context.beginPath(); context.arc(particle.x, particle.y - size * 1.05, size * 0.52, 0, Math.PI * 2); context.fill();
  context.fillStyle = color;
  context.beginPath(); context.arc(particle.x, particle.y - size * 0.1, size * 0.7, 0, Math.PI * 2); context.fill();
  if (particle.carrying) {
    context.fillStyle = particle.carrying === "grain" ? "#e3bc76" : "#8a6943";
    context.fillRect(particle.x + size * .55, particle.y - size * .12, size * 1.15, size * .9);
  }
}

function drawWildlife(context, animal) {
  context.fillStyle = animal.habitat === "water" ? "rgba(117,220,214,.65)" : "rgba(220,181,111,.58)";
  context.beginPath();
  context.ellipse(animal.x, animal.y, animal.habitat === "water" ? 2.8 : 3.8, 1.6, Math.sin(animal.phase * Math.PI) * 0.4, 0, Math.PI * 2);
  context.fill();
}

function drawSettlementLabels(context) {
  context.save();
  context.font = '500 10px "DM Mono", monospace';
  context.textAlign = "center";
  world.settlements.forEach((settlement, index) => {
    const point = worldPointToScreen((settlement.x / 100) * ecosystem.width, (settlement.y / 100) * ecosystem.height);
    context.fillStyle = index === selectedIndex ? "#e9e4d8" : "rgba(211,229,214,.74)";
    context.fillText(settlement.name.toUpperCase(), point.x, point.y - 26);
  });
  context.restore();
}

function drawEcosystem(now) {
  if (cinematic?.enabled && useCinematicWebGL) {
    updateCinematicCamera(now);
    cinematic.render({ world, particles: ecosystem.particles, wildlife: ecosystem.wildlife, encounters: ecosystem.encounters, works: ecosystem.settlementWorks, selectedIndex, width: ecosystem.width, height: ecosystem.height }, now);
    if (now - ecosystem.lastReadout > 550) {
      ecosystem.lastReadout = now;
      updateEcosystemReadout();
    }
    return;
  }
  const context = ecosystem.context;
  if (!context) return;
  const cycle = (now / 50000) % 1;
  const daylight = 0.08 + 0.92 * Math.max(0, Math.sin(cycle * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
  const nightStrength = 1 - daylight;
  updateCinematicCamera(now);
  context.clearRect(0, 0, ecosystem.width, ecosystem.height);
  context.save();
  applyCameraTransform(context);
  if (ecosystem.terrain) context.drawImage(ecosystem.terrain, 0, 0, ecosystem.terrain.width, ecosystem.terrain.height, 0, 0, ecosystem.width, ecosystem.height);

  const dawnGlow = context.createRadialGradient(ecosystem.camera.x, ecosystem.camera.y - ecosystem.height * 0.24, 8, ecosystem.camera.x, ecosystem.camera.y - ecosystem.height * 0.24, ecosystem.width * 0.58);
  dawnGlow.addColorStop(0, "rgba(255,220,145," + (0.08 + daylight * 0.11) + ")");
  dawnGlow.addColorStop(1, "rgba(255,220,145,0)");
  context.fillStyle = dawnGlow;
  context.fillRect(0, 0, ecosystem.width, ecosystem.height);

  fieldSites().forEach((site) => drawResourceSite(context, site, now, nightStrength));

  world.settlements.forEach((settlement, index) => drawVillage(context, settlement, index, nightStrength));
  ecosystem.wildlife.slice().sort((a, b) => a.y - b.y).forEach((animal) => drawWildlife(context, animal));
  ecosystem.particles.forEach((particle) => {
    const color = needColors[particle.activity];
    if (particle.tail.length > 1) {
      context.beginPath();
      particle.tail.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = color + "2d";
      context.lineWidth = 1;
      context.stroke();
    }
  });
  ecosystem.encounters.forEach((encounter) => {
    const life = 1 - (now - encounter.born) / 1400;
    context.globalAlpha = Math.max(0, life);
    context.strokeStyle = encounter.color;
    context.lineWidth = 1.2;
    context.beginPath(); context.arc(encounter.x, encounter.y, 7 + (1 - life) * 20, 0, Math.PI * 2); context.stroke();
  });
  context.globalAlpha = 1;
  ecosystem.particles.slice().sort((a, b) => a.y - b.y).forEach((particle) => drawResidentSprite(context, particle));
  context.restore();

  const darkness = context.createLinearGradient(0, 0, 0, ecosystem.height);
  darkness.addColorStop(0, "rgba(5,14,25," + (nightStrength * 0.16) + ")");
  darkness.addColorStop(1, "rgba(2,8,14," + (nightStrength * 0.46) + ")");
  context.fillStyle = darkness;
  context.fillRect(0, 0, ecosystem.width, ecosystem.height);
  const vignette = context.createRadialGradient(ecosystem.width / 2, ecosystem.height / 2, ecosystem.width * 0.16, ecosystem.width / 2, ecosystem.height / 2, ecosystem.width * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,8,7,.34)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, ecosystem.width, ecosystem.height);
  drawSettlementLabels(context);
  if (now - ecosystem.lastReadout > 550) {
    ecosystem.lastReadout = now;
    updateEcosystemReadout();
  }
}

function commitEcosystemTurn() {
  if (!ecosystem.particles.length) return;
  world.agents = world.agents.map((agent, agentIndex) => {
    const cohort = ecosystem.particles.filter((particle) => particle.agentIndex === agentIndex);
    if (!cohort.length) return agent;
    const needs = Object.fromEntries(Object.keys(agent.needs).map((need) => [need, clamp(cohort.reduce((sum, particle) => sum + particle.needs[need], 0) / cohort.length)]));
    return { ...agent, needs };
  });
  const recentExchanges = ecosystem.exchanges - ecosystem.lastCommittedExchanges;
  if (recentExchanges > 0) {
    const cohesionGain = Math.min(4, Math.max(1, Math.floor(recentExchanges / 2)));
    world.conditions.cohesion = clamp(world.conditions.cohesion + cohesionGain);
    addTrace("Resident exchanges", recentExchanges + " local encounters carried memory between settlements.", "Cohesion +" + cohesionGain + " before the next collective response.");
  }
  ecosystem.lastCommittedExchanges = ecosystem.exchanges;
  const recentDeliveries = ecosystem.deliveries - ecosystem.lastCommittedDeliveries;
  const completed = ecosystem.settlementWorks.reduce((sum, work) => sum + work.completed, 0);
  const newlyCompleted = completed - ecosystem.lastCommittedConstruction;
  if (recentDeliveries > 0) {
    const abundanceGain = Math.min(3, Math.max(1, Math.floor(recentDeliveries / 3)));
    world.conditions.abundance = clamp(world.conditions.abundance + abundanceGain);
    addTrace("Resident delivery loop", recentDeliveries + " gathered resources returned to home settlements.", "Abundance +" + abundanceGain + " from local provisioning.");
  }
  if (newlyCompleted > 0) {
    const builderIndex = ecosystem.settlementWorks.reduce((best, work, index, works) => work.completed > works[best].completed ? index : best, 0);
    const builder = world.settlements[builderIndex];
    if (builder) {
      builder.stability = clamp(builder.stability + newlyCompleted * 3, 12, 96);
      addTrace(builder.name + " / construction", newlyCompleted + " shelter project" + (newlyCompleted === 1 ? " is" : "s are") + " completed from delivered timber.", "Local stability +" + newlyCompleted * 3 + "; maintenance becomes infrastructure.");
      world.pattern = "Maintenance becomes infrastructure";
      world.patternDetail = builder.name + " turned individual shelter-seeking into a durable shared structure.";
    }
  }
  ecosystem.lastCommittedDeliveries = ecosystem.deliveries;
  ecosystem.lastCommittedConstruction = completed;
}

function animateEcosystem(now) {
  if (!ecosystem.running) return;
  if (!ecosystem.reducedMotion || now - (ecosystem.lastFrame || 0) > 180) updateEcosystem(now);
  drawEcosystem(now);
  requestAnimationFrame(animateEcosystem);
}

function initialiseEcosystem() {
  const canvas = $("#ecosystemCanvas");
  if (!canvas || ecosystem.canvas === canvas) return;
  ecosystem.canvas = canvas;
  ecosystem.context = canvas.getContext("2d");
  const cinematicCanvas = $("#cinematicCanvas");
  if (cinematicCanvas) {
    cinematic = createCinematicRenderer(cinematicCanvas);
    if (cinematic.enabled && useCinematicWebGL) $("#worldMap").classList.add("cinematic-ready");
  }
  ecosystem.canvas.addEventListener("click", (event) => {
    const bounds = ecosystem.canvas.getBoundingClientRect();
    const screenX = (event.clientX - bounds.left) * (ecosystem.width / bounds.width);
    const screenY = (event.clientY - bounds.top) * (ecosystem.height / bounds.height);
    const worldX = (screenX - ecosystem.width / 2) / ecosystem.camera.zoom + ecosystem.camera.x;
    const worldY = (screenY - ecosystem.height / 2) / (ecosystem.camera.zoom * 0.72) + ecosystem.camera.y;
    const nearest = world.settlements.map((settlement, index) => ({ index, distance: Math.hypot(worldX - (settlement.x / 100) * ecosystem.width, worldY - (settlement.y / 100) * ecosystem.height) })).sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance < 42) {
      selectedIndex = nearest.index;
      render();
    }
  });
  window.addEventListener("resize", resizeEcosystem);
  resetEcosystem();
  ecosystem.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  ecosystem.running = true;
  requestAnimationFrame(animateEcosystem);
}

function renderMap() {
  updateEcosystemReadout();
}

function renderInspector() {
  const settlement = world.settlements[selectedIndex] || world.settlements[0];
  const neighbours = world.settlements.filter((_, index) => index !== selectedIndex).slice(0, 3);
  $("#inspector").innerHTML = `
    <div class="inspector-label">LOCAL REALITY / ${String(selectedIndex + 1).padStart(2, "0")}</div>
    <h3>${esc(settlement.name)}</h3><p class="biome">${esc(settlement.biome)}</p>
    <div class="stat-grid"><div><span>POPULATION</span><b>${settlement.population.toLocaleString()}</b></div><div><span>STABILITY</span><b>${settlement.stability}%</b></div></div>
    <p class="local-trait">${esc(settlement.trait)}</p>
    <div class="relations"><p>LOCAL RELATIONSHIPS</p>${neighbours.map((neighbour, index) => `<div class="relation-row"><span>${esc(neighbour.name)}</span><b>${index === 0 ? "linked" : index === 1 ? "uneasy" : "distant"}</b></div>`).join("")}</div>`;
}

function renderFactions() {
  $("#factionList").innerHTML = world.factions.map((faction) => `<div class="faction"><div class="faction-top"><b>${esc(faction.name)}</b><em>${faction.influence}%</em></div><p>${esc(faction.goal)}</p><div class="influence"><i style="width:${faction.influence}%"></i></div></div>`).join("");
}

function weakestNeed(agent) {
  return Object.entries(agent.needs).sort(([, a], [, b]) => a - b)[0];
}

function renderAgents() {
  $("#agentList").innerHTML = world.agents.map((agent, index) => {
    const [need, value] = weakestNeed(agent);
    return `<button class="agent-row" data-agent="${index}"><span class="agent-monogram">${esc(agent.name.slice(0, 1))}</span><span class="agent-copy"><b>${esc(agent.name)} <em>${esc(agent.role)}</em></b><small>${esc(agent.focus)}</small><i><u style="width:${value}%"></u></i></span><span class="agent-need">${esc(need)}<strong>${value}</strong></span></button>`;
  }).join("");
  $$(".agent-row").forEach((row) => row.addEventListener("click", () => {
    const agent = world.agents[Number(row.dataset.agent)];
    selectedIndex = Math.max(0, world.settlements.findIndex((settlement) => settlement.name === agent.home));
    render();
  }));
}

function renderChronicle() {
  $("#chronicle").innerHTML = world.events.slice(-6).reverse().map((event) => `<article class="event" style="--event-color:${event.color || "#a8eb93"}"><span>${event.icon || "✦"}</span><div class="event-meta">TURN ${String(event.turn).padStart(2, "0")}</div><h3>${esc(event.title)}</h3><p>${esc(event.detail)}</p></article>`).join("");
}

function render() {
  $("#worldName").textContent = world.name;
  $("#worldSummary").textContent = world.summary;
  $("#eraName").textContent = world.era;
  $("#turnCount").textContent = `turn ${String(world.turn).padStart(2, "0")}`;
  $("#patternName").textContent = world.pattern;
  $("#patternDetail").textContent = world.patternDetail;
  $("#worldInsight").textContent = world.insight;
  renderConditions(); renderTrace(); renderMap(); renderInspector(); renderFactions(); renderAgents(); renderChronicle();
}

function cycleAgents({ recordEvent = false } = {}) {
  const outcomes = {
    food: { verb: "forages beyond the familiar paths", condition: "water", delta: -2, recovery: 19, pattern: "Foraging frontier" },
    shelter: { verb: "repairs a place others had stopped noticing", condition: "abundance", delta: -1, recovery: 17, pattern: "Mutual maintenance" },
    belonging: { verb: "invites an unlikely neighbor into a shared task", condition: "cohesion", delta: 4, recovery: 18, pattern: "Social repair" },
    wonder: { verb: "follows an anomaly no ledger can explain", condition: "mystery", delta: 5, recovery: 16, pattern: "Curiosity network" }
  };
  const reports = [];
  world.agents = world.agents.map((agent, index) => {
    const needs = Object.fromEntries(Object.entries(agent.needs).map(([key, value]) => [key, clamp(value - (key === "food" ? 8 : 5), 8, 100)]));
    const next = { ...agent, needs };
    const [need, value] = weakestNeed(next);
    const outcome = outcomes[need];
    next.needs[need] = clamp(value + outcome.recovery);
    world.conditions[outcome.condition] = clamp(world.conditions[outcome.condition] + outcome.delta);
    const home = world.settlements.find((settlement) => settlement.name === next.home);
    if (home) home.stability = clamp(home.stability + (need === "belonging" ? 3 : need === "food" ? -1 : 1), 12, 96);
    reports.push({ agent: next, need, outcome });
    return next;
  });
  const report = reports.sort((a, b) => a.agent.needs[a.need] - b.agent.needs[b.need])[0];
  if (recordEvent && report) {
    const companion = world.agents.find((agent) => agent.name !== report.agent.name && agent.home !== report.agent.home) || world.agents[1];
    addTrace(report.agent.name + " / " + report.need, report.outcome.verb, report.outcome.condition + " shifts " + (report.outcome.delta > 0 ? "+" : "") + report.outcome.delta + "; " + report.agent.home + " changes with it.");
    world.events.push({
      turn: world.turn,
      title: `${report.agent.name} changes the day`,
      detail: `${report.agent.name}, a ${report.agent.role} of ${report.agent.home}, ${report.outcome.verb}. ${companion.name} notices the effect elsewhere, turning a private need into a shared condition.`,
      icon: "◉", color: "#78e4db"
    });
    world.pattern = report.outcome.pattern;
    world.patternDetail = `${report.agent.name} acted on ${report.need}; the effect reached beyond ${report.agent.home}.`;
  }
  return report;
}

function advanceTurn() {
  if (busy) return;
  world.turn += 1;
  commitEcosystemTurn();
  world.conditions.mystery = clamp(world.conditions.mystery + (world.turn % 2 ? 2 : -1));
  world.conditions.abundance = clamp(world.conditions.abundance + (world.conditions.water > 55 ? 2 : -3));
  cycleAgents({ recordEvent: true });
  render();
  $("#engineNote").innerHTML = "<span class=\"live-dot\"></span> agents acted on their needs <b>•</b> the world advanced without a decree";
}

function evolveWorld(decree) {
  const lower = decree.toLowerCase();
  const delta = { water: 0, abundance: 0, cohesion: 0, mystery: 0 };
  if (/rain|river|flood|tide|water|sea/.test(lower)) { delta.water += /forget|dry|drain/.test(lower) ? -19 : 17; delta.abundance += 4; }
  if (/road|trade|market|bridge|exchange/.test(lower)) { delta.abundance += 13; delta.cohesion += 5; }
  if (/forget|memory|name|history|dream/.test(lower)) { delta.mystery += 16; delta.cohesion += /alone|ban|erase/.test(lower) ? -12 : 7; }
  if (/forest|root|wood|wild|animal/.test(lower)) { delta.mystery += 10; delta.abundance += 5; }
  if (/war|weapon|ban|tax|claim|own/.test(lower)) { delta.cohesion -= 15; delta.abundance -= 4; }
  if (!Object.values(delta).some(Boolean)) { delta.mystery += 8; delta.cohesion += 2; }
  Object.entries(delta).forEach(([key, value]) => { world.conditions[key] = clamp(world.conditions[key] + value); });
  world.turn += 1;
  commitEcosystemTurn();
  const pressure = world.conditions.cohesion < 38 ? "conflict" : world.conditions.water < 36 ? "scarcity" : world.conditions.abundance > 78 ? "prosperity" : world.conditions.mystery > 78 ? "discovery" : "adaptation";
  world.settlements = world.settlements.map((settlement, index) => {
    const localShift = (index % 2 ? delta.mystery : delta.abundance) / 3 - Math.max(0, -delta.cohesion) / 2;
    return { ...settlement, stability: clamp(settlement.stability + localShift, 12, 96), population: Math.max(40, settlement.population + Math.round((delta.abundance + delta.cohesion) / 4)) };
  });
  world.factions = world.factions.map((faction, index) => ({ ...faction, influence: clamp(faction.influence + (index === 0 ? delta.cohesion / 3 : index === 1 ? delta.abundance / 4 : delta.mystery / 4), 8, 95) }));
  cycleAgents();
  const conditionEffects = Object.entries(delta).filter(([, value]) => value).map(([key, value]) => key + " " + (value > 0 ? "+" : "") + value).join(" / ");
  addTrace("Creator decree", decree, conditionEffects || "The world absorbs the force without a visible immediate shift.");
  const anchor = world.settlements[(world.turn + hash(decree)) % world.settlements.length];
  const outcomes = {
    conflict: { title: "The old agreement fractures", detail: `${anchor.name} interprets the decree as a claim against its autonomy. A routine exchange becomes a public argument, and the other settlements must decide which precedent to honor.`, pattern: "Contested legitimacy", color: "#e88676", icon: "×" },
    scarcity: { title: "Scarcity acquires a voice", detail: `As the water recedes, ${anchor.name} changes who is allowed to draw from the shared source. What began as preservation is now rearranging the valley’s trust.`, pattern: "Rationed belonging", color: "#e3bc76", icon: "◒" },
    prosperity: { title: "A surplus changes the map", detail: `${anchor.name} uses the new abundance to make an offer the others cannot easily refuse. Dependence travels farther than gratitude.`, pattern: "Asymmetric exchange", color: "#78e4db", icon: "↗" },
    discovery: { title: "The world answers back", detail: `${anchor.name} notices a response no decree predicted. The anomaly becomes useful before anyone understands what it wants.`, pattern: "Ecological reciprocity", color: "#c4a4f2", icon: "✦" },
    adaptation: { title: "A habit becomes infrastructure", detail: `${anchor.name} alters a small ritual to survive the new condition. Nearby communities copy the practice for different reasons, and the meaning begins to drift.`, pattern: "Distributed adaptation", color: "#a8eb93", icon: "⌁" }
  };
  const outcome = outcomes[pressure];
  world.pattern = outcome.pattern;
  world.patternDetail = "A local response is becoming a shared rule without anyone declaring it one.";
  world.events.push({ turn: world.turn, ...outcome });
  return outcome;
}

async function beginGenesis() {
  if (busy) return;
  const seed = $("#seedInput").value.trim();
  if (!seed) return;
  busy = true;
  $("#genesisButton").innerHTML = "<span>growing…</span><i>◌</i>";
  $("#engineNote").innerHTML = "<span class=\"live-dot\"></span> testing the first conditions…";
  try {
    const response = await fetch("/api/genesis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed }) });
    const data = await response.json();
    world = data.mode === "live" ? normaliseLiveWorld(data.world, seed) : fallbackWorld(seed);
    resetEcosystem();
    $("#engineNote").innerHTML = data.mode === "live" ? "<span class=\"live-dot\"></span> GPT‑5.6 shaped the first conditions <b>•</b> deterministic core active" : "<span class=\"live-dot\"></span> deterministic genesis active <b>•</b> add an API key for GPT‑5.6 narration";
    selectedIndex = 0; render();
  } catch {
    world = fallbackWorld(seed); resetEcosystem(); selectedIndex = 0; render();
    $("#engineNote").textContent = "Local genesis complete. The model layer is unavailable, so SEED is running in deterministic mode.";
  } finally {
    busy = false; $("#genesisButton").innerHTML = "<span>Begin genesis</span><i>↗</i>";
  }
}

async function issueDecree() {
  if (busy) return;
  const decree = $("#decreeInput").value.trim();
  if (!decree) return;
  busy = true; $("#decreeButton").textContent = "…";
  const deterministicEvent = evolveWorld(decree); render();
  try {
    const response = await fetch("/api/decree", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decree, world: { name: world.name, conditions: world.conditions, pattern: world.pattern, settlements: world.settlements.map(({ name, stability, population }) => ({ name, stability, population })) } }) });
    const data = await response.json();
    if (data.mode === "live" && data.event) {
      const event = world.events.at(-1);
      event.title = data.event.title; event.detail = data.event.detail; world.pattern = data.event.pattern; world.patternDetail = "GPT‑5.6 traced this consequence from the simulated state."; render();
      $("#engineNote").innerHTML = "<span class=\"live-dot\"></span> GPT‑5.6 narrated a state-dependent consequence";
    } else {
      $("#engineNote").innerHTML = `<span class=\"live-dot\"></span> ${esc(deterministicEvent.pattern)} detected <b>•</b> local simulation continued`;
    }
  } catch { $("#engineNote").textContent = "The decree changed the simulation; the optional narrative layer is offline."; }
  finally { busy = false; $("#decreeButton").textContent = "↑"; }
}

$("#genesisButton").addEventListener("click", beginGenesis);
$("#seedInput").addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") beginGenesis(); });
$("#decreeButton").addEventListener("click", issueDecree);
$("#decreeInput").addEventListener("keydown", (event) => { if (event.key === "Enter") issueDecree(); });
$("#advanceButton").addEventListener("click", advanceTurn);
$("#resetButton").addEventListener("click", () => { world = structuredClone(initialWorld); resetEcosystem(); selectedIndex = 0; $("#seedInput").value = world.seed; render(); });
$$("[data-seed]").forEach((button) => button.addEventListener("click", () => { $("#seedInput").value = button.dataset.seed; beginGenesis(); }));
$$("[data-decree]").forEach((button) => button.addEventListener("click", () => { $("#decreeInput").value = button.dataset.decree; issueDecree(); }));

initialiseEcosystem();
render();
