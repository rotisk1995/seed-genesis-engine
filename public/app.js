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

function renderMap() {
  const map = $("#worldMap");
  map.querySelectorAll(".settlement").forEach((node) => node.remove());
  const template = $("#settlementTemplate");
  world.settlements.forEach((settlement, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.style.left = `${settlement.x}%`;
    node.style.top = `${settlement.y}%`;
    node.style.setProperty("--settlement", palettes[index % palettes.length]);
    node.classList.toggle("active", index === selectedIndex);
    node.querySelector("b").textContent = settlement.name;
    node.querySelector("small").textContent = settlement.biome;
    node.querySelector("em").style.background = `linear-gradient(90deg, ${palettes[index % palettes.length]}, var(--cyan))`;
    node.addEventListener("click", () => { selectedIndex = index; render(); });
    map.append(node);
  });
  world.agents.forEach((agent, index) => {
    const homeIndex = Math.max(0, world.settlements.findIndex((settlement) => settlement.name === agent.home));
    const home = world.settlements[homeIndex];
    const node = document.createElement("button");
    node.className = "agent-pin";
    node.style.left = `${home.x + [-5, 5, -8, 8, 0][index % 5]}%`;
    node.style.top = `${home.y + [-9, -7, 8, 9, 13][index % 5]}%`;
    node.title = `${agent.name}, ${agent.role}`;
    node.innerHTML = `<span>${esc(agent.name.slice(0, 1))}</span>`;
    node.addEventListener("click", () => { selectedIndex = homeIndex; render(); });
    map.append(node);
  });
  $("#mapStatus").textContent = `${world.settlements.length} settlements / ${world.factions.length} pressures / ${world.turn} turns observed`;
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
  renderConditions(); renderMap(); renderInspector(); renderFactions(); renderAgents(); renderChronicle();
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
  const pressure = world.conditions.cohesion < 38 ? "conflict" : world.conditions.water < 36 ? "scarcity" : world.conditions.abundance > 78 ? "prosperity" : world.conditions.mystery > 78 ? "discovery" : "adaptation";
  world.settlements = world.settlements.map((settlement, index) => {
    const localShift = (index % 2 ? delta.mystery : delta.abundance) / 3 - Math.max(0, -delta.cohesion) / 2;
    return { ...settlement, stability: clamp(settlement.stability + localShift, 12, 96), population: Math.max(40, settlement.population + Math.round((delta.abundance + delta.cohesion) / 4)) };
  });
  world.factions = world.factions.map((faction, index) => ({ ...faction, influence: clamp(faction.influence + (index === 0 ? delta.cohesion / 3 : index === 1 ? delta.abundance / 4 : delta.mystery / 4), 8, 95) }));
  cycleAgents();
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
    $("#engineNote").innerHTML = data.mode === "live" ? "<span class=\"live-dot\"></span> GPT‑5.6 shaped the first conditions <b>•</b> deterministic core active" : "<span class=\"live-dot\"></span> deterministic genesis active <b>•</b> add an API key for GPT‑5.6 narration";
    selectedIndex = 0; render();
  } catch {
    world = fallbackWorld(seed); selectedIndex = 0; render();
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
$("#resetButton").addEventListener("click", () => { world = structuredClone(initialWorld); selectedIndex = 0; $("#seedInput").value = world.seed; render(); });
$$("[data-seed]").forEach((button) => button.addEventListener("click", () => { $("#seedInput").value = button.dataset.seed; beginGenesis(); }));
$$("[data-decree]").forEach((button) => button.addEventListener("click", () => { $("#decreeInput").value = button.dataset.decree; issueDecree(); }));

render();
