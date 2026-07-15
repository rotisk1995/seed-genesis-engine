import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(root, "public");
const threeModule = path.resolve(root, "node_modules", "three", "build", "three.module.js");
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5.6";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, payload, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(typeof payload === "string" ? payload : JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function responseText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((item) => item.text || item.value || "")
    .join("");
}

async function structuredResponse(instructions, name, schema) {
  if (!process.env.OPENAI_API_KEY) return { ok: false, reason: "OPENAI_API_KEY is not configured" };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: instructions,
      text: { format: { type: "json_schema", name, strict: true, schema } }
    })
  });

  if (!response.ok) return { ok: false, reason: `OpenAI returned ${response.status}` };
  try {
    return { ok: true, data: JSON.parse(responseText(await response.json())) };
  } catch {
    return { ok: false, reason: "The model response was not valid JSON" };
  }
}

const worldSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "era", "summary", "insight", "settlements", "factions", "events"],
  properties: {
    name: { type: "string" },
    era: { type: "string" },
    summary: { type: "string" },
    insight: { type: "string" },
    settlements: {
      type: "array", minItems: 3, maxItems: 5,
      items: {
        type: "object", additionalProperties: false,
        required: ["name", "biome", "trait", "population", "stability", "x", "y"],
        properties: {
          name: { type: "string" }, biome: { type: "string" }, trait: { type: "string" },
          population: { type: "integer", minimum: 30, maximum: 5000 }, stability: { type: "integer", minimum: 0, maximum: 100 },
          x: { type: "integer", minimum: 10, maximum: 90 }, y: { type: "integer", minimum: 14, maximum: 84 }
        }
      }
    },
    factions: {
      type: "array", minItems: 2, maxItems: 4,
      items: {
        type: "object", additionalProperties: false, required: ["name", "goal", "influence"],
        properties: { name: { type: "string" }, goal: { type: "string" }, influence: { type: "integer", minimum: 1, maximum: 100 } }
      }
    },
    events: {
      type: "array", minItems: 2, maxItems: 4,
      items: {
        type: "object", additionalProperties: false, required: ["title", "detail"],
        properties: { title: { type: "string" }, detail: { type: "string" } }
      }
    }
  }
};

const decreeSchema = {
  type: "object", additionalProperties: false, required: ["title", "detail", "pattern"],
  properties: { title: { type: "string" }, detail: { type: "string" }, pattern: { type: "string" } }
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = requested === "/vendor/three.module.js" ? threeModule : path.resolve(publicRoot, `.${requested}`);
  if (requested !== "/vendor/three.module.js" && !filePath.startsWith(publicRoot)) return send(res, 403, "Forbidden", "text/plain");
  try {
    const file = await readFile(filePath);
    send(res, 200, file.toString(), mimeTypes[path.extname(filePath)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found", "text/plain");
  }
}

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/genesis") {
      const { seed = "" } = await readJson(req);
      const instructions = `You are SEED, a genesis engine for emergent worlds. Create a compact, internally coherent simulation world from this seed: "${seed}". Do not make a game pitch. Focus on causal tensions between ecology, culture, resources, and collective memory. Give each settlement a different relationship to the world. Keep prose evocative but concise.`;
      const answer = await structuredResponse(instructions, "seed_genesis", worldSchema);
      return send(res, 200, { mode: answer.ok ? "live" : "fallback", world: answer.ok ? answer.data : null, reason: answer.reason || null });
    }

    if (req.method === "POST" && req.url === "/api/decree") {
      const { decree = "", world = {} } = await readJson(req);
      const instructions = `You are the narrative layer of an emergent-world simulator. A creator issues this decree: "${decree}". Given this compact simulation state: ${JSON.stringify(world)}. Describe one consequence that follows from the state, not merely from the decree. Return a short event title, a one or two sentence consequence, and the emergent pattern it reveals.`;
      const answer = await structuredResponse(instructions, "seed_decree", decreeSchema);
      return send(res, 200, { mode: answer.ok ? "live" : "fallback", event: answer.ok ? answer.data : null, reason: answer.reason || null });
    }

    if (req.method === "GET") return serveStatic(req, res);
    send(res, 405, { error: "Method not allowed" });
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}).listen(port, () => console.log(`SEED is growing at http://localhost:${port}`));
