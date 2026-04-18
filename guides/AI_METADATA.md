# AI Metadata Generation

Generate title, description, and tags automatically from video content using AI.

## Overview

When users upload videos, AI will analyze both the visual frames and audio/transcript to generate metadata automatically.

## Pipeline

```
1. Extract frames from video (every 10 seconds)
2. Extract audio clip (first 30 seconds)
3. Send frames + audio to server API
4. Server transcribes audio with Whisper
5. Server sends frames + transcript to AI
6. AI generates title, description, tags
7. Auto-fill upload form fields
```

## Implementation

### Step 1: Client-side - Extract Frames

**Location:** `apps/web/src/lib/video-thumbnail.ts`

```typescript
export async function extractFramesAtIntervals(
  file: File,
  options: ExtractFramesOptions = {},
): Promise<VideoFrame[]> {
  const { intervalSeconds = 10, maxWidth = 640, quality = 0.7 } = options;

  // Create video element
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = URL.createObjectURL(file);

  await waitForMetadata(video);

  // Calculate frame count (max 6 for 60s video)
  const frameCount = Math.min(Math.floor(video.duration / intervalSeconds), 6);

  // Extract frames at each interval
  const frames: VideoFrame[] = [];
  for (let i = 1; i <= frameCount; i++) {
    const timestamp = intervalSeconds * i;
    await seekTo(video, timestamp);

    const canvas = drawFrameToCanvas(video, maxWidth);
    frames.push({
      dataUrl: canvas.toDataURL("image/jpeg", quality),
      timestampSeconds: timestamp,
    });
  }

  return frames;
}
```

### Step 2: Client-side - Extract Audio

**Location:** `apps/web/src/lib/video-thumbnail.ts`

```typescript
export async function extractAudioFromVideo(
  file: File,
  maxDurationSeconds: number = 30,
): Promise<Blob> {
  // Use Web Audio API to extract audio track
  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Trim to max duration
  const trimmedLength = Math.min(
    audioBuffer.length,
    maxDurationSeconds * audioBuffer.sampleRate,
  );

  // Convert to WAV blob
  return audioBufferToWav(audioBuffer, trimmedLength);
}
```

### Step 3: Server API - Generate Metadata

**Location:** `apps/web/src/app/api/generate-metadata/route.ts`

```typescript
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { whisper } from "@ai-sdk/openai";

// Request: { frames: string[], audioBlob: Blob }
// Response: { title: string, description: string, tags: string[] }

export async function POST(request: Request) {
  const formData = await request.formData();
  const framesJson = formData.get("frames") as string;
  const audioFile = formData.get("audio") as File;

  const frames = JSON.parse(framesJson);

  // Step 1: Transcribe audio with Whisper
  const audioArrayBuffer = await audioFile.arrayBuffer();
  const transcript = await whisper.transcribe(audioArrayBuffer, {
    language: "en",
  });

  // Step 2: Generate metadata with AI vision
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      title: z.string().describe("Catchy title, max 80 characters"),
      description: z.string().describe("Description, max 500 characters"),
      tags: z.array(z.string()).describe("Up to 8 relevant tags"),
    }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this video using:
- Visual frames at: ${frames.map((f: any) => `${f.timestampSeconds}s`).join(", ")}
- Audio transcript: "${transcript.text}"

Generate:
1. A catchy title (max 80 chars)
2. A description (max 500 chars)
3. Up to 8 relevant tags

Be creative and descriptive.`,
          },
          ...frames.map((frame: any) => ({
            type: "image" as const,
            image: frame.dataUrl,
          })),
        ],
      },
    ],
  });

  return Response.json(result.object);
}
```

## Optimizations

### 1. Image Optimization

- Resize frames to 640px width (not 1080p/4k)
- Compress JPEG quality to 0.7
- Convert to base64 data URLs

### 2. Audio Optimization

- Only first 30 seconds (enough context)
- Use whisper-base model (fast + cheap)
- Or use Web Speech API as client-side alternative (free, browser-limited)

### 3. Cost Optimization

- Use `gpt-4o-mini` or `claude-3-haiku` (80-90% cheaper)
- Cache results by video hash
- Rate limit: 1 request per upload

### 4. Alternative Approaches

**Option A (Simplest):** Just frames + AI from visuals

- No audio transcription
- Faster, cheaper
- May miss audio context

**Option B (Web Speech API):** Client-side transcription

- No server costs
- Limited browser support
- Privacy-friendly

**Option C (Full):** Frames + Whisper + Vision

- Best quality
- Full context from both visual + audio

## UI Integration

**Location:** `apps/web/src/components/upload/UploadForm.tsx`

Add "Generate with AI" button:

```tsx
<Button
  type="button"
  variant="outline"
  onClick={handleGenerateMetadata}
  disabled={isGenerating}
>
  {isGenerating ? "Generating..." : "✨ Generate with AI"}
</Button>
```

When clicked:

1. Show loading state
2. Extract frames + audio
3. Call API
4. Auto-fill form fields: title, description, tags

## Estimated Costs

Per video (60s, 6 frames + 30s audio):

- Whisper: ~$0.01
- GPT-4o-mini: ~$0.02
- **Total: ~$0.03 per video**
