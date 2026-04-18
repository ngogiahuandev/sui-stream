import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const metadataSchema = z.object({
  title: z.string().max(80),
  description: z.string().max(500),
  tags: z.array(z.string()).max(3),
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
  const formData = await request.formData();
  const framesJson = formData.get('frames') as string;
  const hasAudio = formData.get('hasAudio') === 'true';
  const existingTagsJson = formData.get('existingTags') as string | null;

  if (!framesJson) {
    return Response.json({ error: 'Missing frames data' }, { status: 400 });
  }

  let frames: { dataUrl: string; timestampSeconds: number }[];
  try {
    frames = JSON.parse(framesJson);
  } catch {
    return Response.json({ error: 'Invalid frames format' }, { status: 400 });
  }

  if (frames.length === 0) {
    return Response.json({ error: 'No frames provided' }, { status: 400 });
  }

  let existingTags: string[] = [];
  if (existingTagsJson) {
    try {
      const parsed = JSON.parse(existingTagsJson);
      if (Array.isArray(parsed)) {
        existingTags = parsed
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.toLowerCase().trim())
          .filter((t) => t.length > 0 && t.length <= 24)
          .slice(0, 50);
      }
    } catch {
      existingTags = [];
    }
  }

  const frameDescriptions = frames
    .map((f) => `@${f.timestampSeconds}s`)
    .join(', ');

  const existingTagsBlock =
    existingTags.length > 0
      ? `\n\nEXISTING TAGS ON THE PLATFORM (reuse when relevant — this keeps the tag catalog small):\n${existingTags.join(', ')}\n\nTAG SELECTION STRATEGY:\n- If any existing tag clearly matches the video's subject or category, REUSE it verbatim (prefer reuse over invention).\n- You may mix reused tags with up to 1 new tag ONLY if no existing tag fits that aspect.\n- Do NOT invent near-duplicates of existing tags (e.g., if "cooking" exists, do not emit "cook" or "cooking-food"; reuse "cooking").\n- Do NOT pick existing tags that are irrelevant just to reuse them.`
      : '';

  const prompt = `Analyze this video frames at: ${frameDescriptions}.${
    hasAudio ? ' The video also has audio content.' : ''
  }\n\nGenerate a catchy title (max 80 chars), description (max 500 chars), and exactly 3 general tags. Be creative and descriptive based on the visual content.\n\nTAGS RULES:\n- All tags must be lowercase only\n- Use hyphen (-) instead of space for multi-word tags (e.g., "street-food" not "street food")\n- Must be general/categorization tags, not specific (e.g., "nature", "dance", "comedy" not "my-dog-buddy")\n- Exactly 3 tags only${existingTagsBlock}\n\nRespond in this exact JSON format:
{"title": "...", "description": "...", "tags": ["tag1", "tag2", "tag3"]}`;

  try {
    const model = getAIModel();
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...frames.map((frame) => ({
              type: 'image' as const,
              image: frame.dataUrl,
            })),
          ],
        },
      ],
    });

    const text = result.text.trim();

    let metadata;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      }
    } catch {
      metadata = null;
    }

    if (
      !metadata ||
      !metadata.title ||
      !metadata.description ||
      !metadata.tags
    ) {
      return Response.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    const parsed = metadataSchema.parse(metadata);
    return Response.json(parsed);
  } catch (error) {
    console.error('[generate-metadata] AI error:', error);
    return Response.json(
      { error: 'Failed to generate metadata' },
      { status: 500 }
    );
  }
}
