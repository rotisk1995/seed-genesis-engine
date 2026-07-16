# SEED — A Genesis Engine for Emergent Worlds

SEED is an AI-native genesis engine for emergent worlds. It gives autonomous life simple rules, then lets societies, resources, relationships, and history co-evolve through causal simulation. **Emergent Village** is its first proof world.

> SEED does not script a story—it creates conditions for stories to emerge.

## What it does

- Creates a living world from a one-line premise.
- Simulates world conditions: water, abundance, cohesion, and mystery.
- Models distinct settlements, collective pressures, local stability, and an evolving chronicle.
- Gives autonomous residents needs for food, shelter, belonging, and wonder; advancing a turn lets their responses alter the world without a creator decree.
- Visualizes a live cellular field: independent simulation particles pursue needs, remember cross-settlement encounters, form local ties, and deposit their effects into a visible grid rather than appearing as pre-authored characters.
- Simulates finite, regenerating grain and timber sources. Residents retain partial site knowledge, discover or exchange routes locally, gather materials, carry a source-specific pigment home, and turn delivered timber into a new shelter rather than a scripted upgrade.
- Uses a state-derived RGBA pigment system rather than fixed role colors: residents continuously blend their inherited signal with needs, knowledge, memory, social ties, environmental conditions, and the material they carry. Each shelter inherits the mixed pigment history of the timber that built it.
- Renders that same state as a real-time cellular substrate: material movement ignites colored local cells, encounters diffuse memory, and delivered timber leaves persistent lattice forms. No resident, house, or settlement icon is drawn as a preset object.
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

The renderer is deliberately a view of the simulation, not a separate animation layer: active cells, pigment diffusion, material flux, and persistent lattice formation come from active local state. This lets a judge connect what they see to an inspectable causal system without mistaking an icon for an outcome.

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
