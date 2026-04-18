import { UploadForm } from '@/components/upload/UploadForm';

export function UploadView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-2 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Upload a clip</h1>
        <p className="text-sm text-muted-foreground">
          Share a clip on SuiStream — up to 1 hour and 1 GB. We&apos;ll generate
          a thumbnail automatically from your video.
        </p>
      </header>
      <UploadForm />
    </div>
  );
}
