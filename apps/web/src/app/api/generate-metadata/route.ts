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

  const frameDescriptions = frames
    .map((f) => `@${f.timestampSeconds}s`)
    .join(', ');

  const prompt = `Analyze this video frames at: ${frameDescriptions}.${
    hasAudio ? ' The video also has audio content.' : ''
  }\n\nGenerate a catchy title (max 80 chars), description (max 500 chars), and exactly 3 general tags. Be creative and descriptive based on the visual content.\n\nTAGS RULES:\n- All tags must be lowercase only\n- Use hyphen (-) instead of space for multi-word tags (e.g., "street-food" not "street food")\n- Must be general/categorization tags, not specific (e.g., "nature", "dance", "comedy" not "my-dog-buddy")\n- Exactly 3 tags only\n\nRespond in this exact JSON format:
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
