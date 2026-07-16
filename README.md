# SEED — A Genesis Engine for Emergent Worlds

SEED is an AI-native genesis engine for emergent worlds. It gives autonomous life simple rules, then lets societies, resources, relationships, and history co-evolve through causal simulation. **Emergent Village** is its first proof world.

> SEED does not script a story—it creates conditions for stories to emerge.

## What it does

- Creates a living world from a one-line premise.
- Simulates world conditions: water, abundance, cohesion, and mystery.
- Models distinct settlements, collective pressures, local stability, and an evolving chronicle.
- Gives autonomous residents needs for food, shelter, belonging, and wonder; advancing a turn lets their responses alter the world without a creator decree.
- Visualizes a live resident field: independent particles pursue needs, remember cross-settlement encounters, form local ties, and feed those exchanges into the next simulation turn.
- Simulates finite, regenerating grain and timber sources. Residents retain partial site knowledge, discover or exchange routes locally, gather resources, carry them home, and turn delivered timber into a new shelter rather than a scripted upgrade.
- Renders that same state as an original real-time WebGL observation scene: procedural terrain, water, roads, settlement buildings, residents, wildlife, atmospheric light, and a moving observer camera.
- Lets a creator issue a decree and observe a state-dependent consequence.
- Surfaces a causal trace so each decree or autonomous action can be connected to the changing conditions it produces.
- Uses GPT-5.6 for structured world genesis and narrative consequence when an API key is available; remains fully usable with its deterministic simulation fallback.

## Run locally

Requires Node.js 18 or later.

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Enable GPT-5.6

SEED never exposes an API key to the browser. Copy `.env.example` values into your terminal environment before starting the server:

```powershell
$env:OPENAI_API_KEY = "your_api_key"
$env:OPENAI_MODEL = "gpt-5.6"
npm run dev
```

With an API key, the app uses the OpenAI Responses API and JSON Schema structured outputs for:

1. **Genesis:** transforming a seed into a coherent set of settlements, factions, tensions, and origin events.
2. **Consequences:** narrating a consequence from the simulation state after a decree has already altered it.

Without a key, the deterministic core generates worlds and evolves them locally, so judges can still experience the complete interaction loop.

## Architecture

```text
world seed → GPT-5.6 structured genesis (optional) → deterministic world state
                                                         ↓
creator decree → condition deltas → settlement/faction changes → chronicle event
                                                         ↓
                                      GPT-5.6 consequence narration (optional)
```

The deterministic simulation owns the truth of the world state. The model enriches the initial world and explains its consequences; it does not replace the system’s causal logic.

The renderer is deliberately a view of the simulation, not a separate animation layer: resident positions and colors come from their current local need, wildlife follows its own habitat behavior, and the camera follows selected settlements or recent encounters. This lets a judge connect what they see to an inspectable causal system.

The implementation roadmap and official requirements are documented in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).

## OpenAI Build Week

SEED is built with Codex and GPT-5.6 for OpenAI Build Week.

- **Codex collaboration:** Codex accelerated system architecture, implementation, debugging, interaction design, and the visual simulation interface.
- **Key human decisions:** the product’s focus on emergence rather than game generation; the causal simulation model; the visual direction; and the standards for what counts as a meaningful consequence.
- **GPT-5.6 contribution:** structured world genesis plus context-aware chronicle narration through the Responses API.

The project is newly created during Build Week. A public deployment URL and short demo video will be added before submission.

## Verification

```powershell
npm run check
```

## License

[MIT](LICENSE)
