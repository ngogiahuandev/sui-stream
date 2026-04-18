import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const requestSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(24).default(12),
  clips: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().default(''),
        description: z.string().default(''),
        tags: z.array(z.string()).default([]),
        durationSeconds: z.number().nonnegative().default(0),
      })
    )
    .min(1)
    .max(200),
});

const responseSchema = z.object({
  clipIds: z.array(z.string()).max(24),
  explanation: z.string().max(280).default(''),
});

function getAIModel() {
  if (OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
    });
    return openrouter('google/gemini-2.0-flash-001');
  }
  const openai = createOpenAI();
  return openai('gpt-4o-mini');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { query, limit, clips } = parsed.data;

  const catalog = clips
    .map((clip) => {
      const tags = clip.tags.length > 0 ? clip.tags.join(', ') : '—';
      const duration = clip.durationSeconds
        ? `${Math.round(clip.durationSeconds)}s`
        : '—';
      const desc = clip.description
        ? clip.description.length > 180
          ? `${clip.description.slice(0, 180)}…`
          : clip.description
        : '—';
      return `- id: ${clip.id}\n  title: ${clip.title || '—'}\n  description: ${desc}\n  tags: ${tags}\n  duration: ${duration}`;
    })
    .join('\n');

  const prompt = `You are a video-recommendation engine for a short-video platform. A user has described what they want to watch. You must pick the clips from the CATALOG that best match the user's intent.

USER REQUEST:
"""${query}"""

CATALOG (${clips.length} clips):
${catalog}

TASK:
1. Choose up to ${limit} clips from the CATALOG that best satisfy the user's request.
2. Rank the chosen clips from most to least relevant.
3. Use ONLY ids that appear in the CATALOG — do not invent ids.
4. Match on title, description, and tags together, not just keywords. Infer intent (mood, topic, genre).
5. If nothing in the catalog fits, return an empty list and say so in the explanation.
6. Keep the explanation to one short sentence (max 200 chars) describing the theme of your picks.

Respond with ONLY a JSON object, no prose, no code fences:
{"clipIds": ["id1", "id2", ...], "explanation": "one short sentence"}`;

  try {
    const model = getAIModel();
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = result.text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json(
        { error: 'AI did not return JSON' },
        { status: 500 }
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(match[0]);
    } catch {
      return Response.json(
        { error: 'AI response was not valid JSON' },
        { status: 500 }
      );
    }

    const safe = responseSchema.safeParse(raw);
    if (!safe.success) {
      return Response.json(
        { error: 'AI response failed schema validation' },
        { status: 500 }
      );
    }

    const validIds = new Set(clips.map((c) => c.id));
    const clipIds = safe.data.clipIds
      .filter((id) => validIds.has(id))
      .slice(0, limit);

    return Response.json({ clipIds, explanation: safe.data.explanation });
  } catch (error) {
    console.error('[discover] AI error:', error);
    return Response.json(
      { error: 'Failed to generate discovery picks' },
      { status: 500 }
    );
  }
}
