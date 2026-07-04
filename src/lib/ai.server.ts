// Server-only helpers for Lovable AI Gateway.
// Do NOT import this file from client-reachable modules — use ai.functions.ts.

const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

function getKey(): string {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY is not configured");
  return k;
}

export type PhotoAnalysis = {
  issue_type: "pothole" | "garbage" | "streetlight" | "other";
  title: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  summary: string;
};

const ANALYZE_SYSTEM = `You are a civic-issue triage assistant for a city reporting app.
Look at the photo and (optional) citizen note, then respond with a STRICT JSON object matching this shape:
{
  "issue_type": "pothole" | "garbage" | "streetlight" | "other",
  "title": string (max 80 chars, action-oriented, no emoji),
  "description": string (2-3 sentences describing what is visible and any obvious hazard),
  "severity": integer 1-5 (1=cosmetic, 3=disruptive, 5=dangerous/urgent),
  "summary": string (one short sentence for admin triage lists)
}
Only respond with the JSON object, no prose, no code fences.`;

export async function analyzePhoto(opts: {
  photoDataUrl: string;
  userNote?: string;
}): Promise<PhotoAnalysis> {
  const res = await fetch(`${GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: ANALYZE_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: opts.userNote
                ? `Citizen note: ${opts.userNote}\nAnalyze the photo and return JSON.`
                : `Analyze the photo and return JSON.`,
            },
            { type: "image_url", image_url: { url: opts.photoDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Lovable settings.");
    throw new Error(`AI analyze failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some models wrap in ```json blocks despite response_format
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }
  return normalizeAnalysis(parsed);
}

function normalizeAnalysis(p: any): PhotoAnalysis {
  const allowed = ["pothole", "garbage", "streetlight", "other"] as const;
  const issue_type = allowed.includes(p.issue_type) ? p.issue_type : "other";
  const sev = Math.max(1, Math.min(5, Math.round(Number(p.severity) || 3))) as 1 | 2 | 3 | 4 | 5;
  return {
    issue_type,
    title: String(p.title ?? "").slice(0, 80) || "Civic issue reported",
    description: String(p.description ?? "").slice(0, 800),
    severity: sev,
    summary: String(p.summary ?? "").slice(0, 200),
  };
}

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${GATEWAY_BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embedding failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const vec = json.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("Embedding response missing vector");
  return vec;
}

// Deterministic priority: severity (0-100) + duplicate weight + recency-neutral.
// duplicateSignal = sum of upvotes on similar nearby recent reports.
export function computePriority(opts: {
  severity: number;
  duplicateSignal: number;
  duplicateCount: number;
}): number {
  const sev = Math.max(0, Math.min(5, opts.severity)) * 15; // 0-75
  const dups = Math.min(50, opts.duplicateCount * 5); // repeat-report bump
  const upvotes = Math.min(30, opts.duplicateSignal * 1.5);
  return Number((sev + dups + upvotes).toFixed(2));
}
