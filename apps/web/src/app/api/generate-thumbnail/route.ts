export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const IMAGE_MODEL = 'google/gemini-2.5-flash-image';

interface OpenRouterImage {
  type?: string;
  image_url?: { url?: string };
}

interface OpenRouterChoice {
  message?: {
    content?: string;
    images?: OpenRouterImage[];
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
}

function extractImageDataUrl(data: OpenRouterResponse): string | null {
  const choice = data.choices?.[0];
  const images = choice?.message?.images;
  if (Array.isArray(images)) {
    for (const image of images) {
      const url = image?.image_url?.url;
      if (typeof url === 'string' && url.startsWith('data:image/')) {
        return url;
      }
    }
  }
  const content = choice?.message?.content;
  if (typeof content === 'string') {
    const match = content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
    if (match) return match[0];
  }
  return null;
}

export async function POST(request: Request) {
  if (!OPENROUTER_API_KEY) {
    return Response.json(
      { error: 'Thumbnail generation is not configured.' },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const framesJson = formData.get('frames') as string | null;
  const title = ((formData.get('title') as string | null) ?? '').trim();
  const description = ((formData.get('description') as string | null) ?? '').trim();
  const aspectRatio = ((formData.get('aspectRatio') as string | null) ?? '16:9').trim();
  const aspectWidth = Number(formData.get('aspectWidth') ?? 0);
  const aspectHeight = Number(formData.get('aspectHeight') ?? 0);
  const orientation =
    aspectRatio === '9:16'
      ? 'vertical / portrait'
      : aspectRatio === '1:1'
        ? 'square'
        : 'horizontal / landscape';

  if (!framesJson) {
    return Response.json({ error: 'Missing frames data' }, { status: 400 });
  }

  let frames: { dataUrl: string; timestampSeconds: number }[];
  try {
    frames = JSON.parse(framesJson);
  } catch {
    return Response.json({ error: 'Invalid frames format' }, { status: 400 });
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    return Response.json({ error: 'No frames provided' }, { status: 400 });
  }

  const contextLines = [
    title ? `Title: "${title}"` : null,
    description ? `Description: "${description}"` : null,
  ].filter(Boolean);

  const dimensionHint =
    aspectWidth > 0 && aspectHeight > 0
      ? ` (source video dimensions ${aspectWidth}×${aspectHeight})`
      : '';

  const prompt = `You are an expert short-video thumbnail designer. You receive reference frames sampled from a ${aspectRatio} ${orientation} short-form video${dimensionHint} and must generate ONE original, scroll-stopping thumbnail image that represents this specific video.

${contextLines.length ? `VIDEO CONTEXT:\n${contextLines.join('\n')}\n\n` : ''}GOAL:
Create a thumbnail that makes a viewer stop scrolling and tap. It must feel like it belongs to THIS video — same subject, setting, mood, and visual identity as the reference frames — not a generic stock image.

COMPOSITION:
- Aspect ratio: MUST be exactly ${aspectRatio} (${orientation})${dimensionHint}. Do not output a square or a different orientation under any circumstances.
- Fill the entire ${aspectRatio} canvas edge-to-edge. No letterboxing, pillarboxing, borders, or padding bars.
- Clear single focal point, large and centered or placed using the rule of thirds
- Foreground subject sharp; background can be softly blurred for depth
- Leave breathing room; avoid cluttered edges

STYLE:
- Cinematic lighting with strong contrast and rich, saturated but believable colors
- Crisp, high-detail photographic look unless the reference frames are clearly illustrated/animated — then match that style
- Preserve recognizable elements from the reference frames (main subject, key objects, location, wardrobe, color palette, time of day)
- Evoke the same emotion the video conveys (energy, calm, humor, awe, etc.)

HARD RULES:
- Do NOT render any text, numbers, captions, subtitles, watermarks, logos, UI elements, borders, frames, or arrows
- Do NOT add play buttons or video-player overlays
- Do NOT produce collages, split-screens, or multiple panels — a single unified image only
- Do NOT invent a subject that is not supported by the reference frames
- Output exactly one image.`;

  const body = {
    model: IMAGE_MODEL,
    modalities: ['image', 'text'],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...frames.map((frame) => ({
            type: 'image_url' as const,
            image_url: { url: frame.dataUrl },
          })),
        ],
      },
    ],
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as OpenRouterResponse;

    if (!response.ok) {
      console.error('[generate-thumbnail] OpenRouter error:', data);
      return Response.json(
        { error: data.error?.message ?? 'Thumbnail generation failed' },
        { status: 500 }
      );
    }

    const dataUrl = extractImageDataUrl(data);
    if (!dataUrl) {
      console.error('[generate-thumbnail] No image in response:', data);
      return Response.json(
        { error: 'Model did not return an image' },
        { status: 500 }
      );
    }

    return Response.json({ dataUrl });
  } catch (error) {
    console.error('[generate-thumbnail] AI error:', error);
    return Response.json(
      { error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}
