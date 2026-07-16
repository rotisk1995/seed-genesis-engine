# SEED Product Requirements

## Product identity

SEED is a genesis engine for emergent worlds. It establishes physical, biological, cognitive, environmental, and social rules; it does not script civilizations.

**Emergent Village** is the first proof world built on the engine. It demonstrates that local autonomous behavior can produce settlement-scale patterns.

## Product principles

1. **Emergence first.** Villages, markets, roads, specializations, institutions, conflicts, and cultures are outcomes of rules and interactions, never pre-authored objects.
2. **Autonomous agents.** Each resident has needs, memory, relationships, goals, skills, and local knowledge. There is no omniscient global decision-maker.
3. **Local knowledge.** Agents learn through movement, observation, conversation, trade, teaching, and discovery.
4. **Persistent consequence.** Decisions alter the world state and history rather than being reset or narrated away.
5. **Ecological feedback.** Resources, weather, animals, plants, construction, and population affect one another.
6. **Causal appearance.** Color, light, carried materials, trails, and construction are outputs of active state. The renderer must not use a fixed palette to imply a behavior the simulation did not produce.

## Simulation layers

| Layer | Required behavior |
| --- | --- |
| Environment | Terrain, regenerating resources, weather, seasons, and ecological constraints influence available actions. |
| Life | Plants, animals, and residents compete, cooperate, reproduce, migrate, and adapt through local pressures. |
| Individual | Residents manage biological and psychological needs, memory, relationships, inventory, health, skills, and evolving goals. |
| Social | Communication spreads knowledge; scarcity and exchange can create trade, specialization, cooperation, conflict, and leadership. |
| Civilization | Settlements, economies, technologies, traditions, infrastructure, politics, and cultures emerge from lower layers. |

## Build Week MVP: living field

The current demonstration prioritizes an inspectable causal loop:

1. Residents move in real time based on independent food, shelter, belonging, and curiosity needs.
2. Residents remember encounters and form local cross-settlement ties.
3. Resource sites and shared destinations create visible flows, trails, and encounter rings.
4. Food and timber are finite, regenerating local sources. Residents begin with partial site knowledge, discover locations through movement, and exchange routes during encounters before gathering and carrying resources home.
5. Local stores, visible site depletion, and delivered timber produce a shelter project; no building appears from a preset event.
6. Resource sites generate their own pigments from seed, location, availability, and environmental conditions. Residents blend these materials with evolving individual, social, and ecological state; construction preserves the actual delivered timber pigment history.
7. Advancing a world turn aggregates resident needs, deliveries, construction, and local exchanges into agent state, abundance, cohesion, chronicle entries, and larger patterns.
8. Creator decrees change the conditions that residents subsequently experience.

## Cinematic observation

Emergent Village is presented as an original elevated observer simulation. The camera follows settlements and meaningful encounters through a living terrain with readable residents, wildlife, construction, weather, and a day-night cycle. Information overlays remain compact and support observation; they do not replace the world as the primary experience.

## Success criteria

- Runs begun from different seeds diverge.
- The visible behavior can be traced to state and rules.
- No village, profession, market, or institution is added merely as a preset.
- A viewer can observe low-level interactions producing higher-level effects.
- The resulting chronicle contains outcomes that were not manually authored.

## Growth path

The engine must scale without architectural redesign from individual residents to families, villages, towns, cities, and multiple civilizations. Future modules include terrain generation, weather, food webs, trade and inventories, construction, learning, language, culture, technology, migration, diplomacy, and historical replay.
