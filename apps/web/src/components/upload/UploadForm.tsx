'use client';

import { useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import {
  Ban,
  CoinsIcon,
  Loader2Icon,
  SparklesIcon,
  UploadCloudIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { VideoPreview } from '@/components/upload/VideoPreview';
import { UploadProgressOverlay } from '@/components/upload/UploadProgressOverlay';
import { UploadOverviewTab } from '@/components/upload/UploadOverviewTab';
import { UploadCampaignTab } from '@/components/upload/UploadCampaignTab';
import { useClipUpload } from '@/hooks/useClipUpload';
import { cn } from '@/lib/utils';
import type { UploadFormValues } from '@/lib/validation/upload-schema';

type TabValue = 'overview' | 'campaign';

const OVERVIEW_FIELDS = ['title', 'description', 'tagsInput'] as const;
const CAMPAIGN_FIELDS = [
  'missionsEnabled',
  'includeLike',
  'includeComment',
  'rewardSui',
  'maxClaims',
  'durationDays',
] as const;

function hasOverviewErrors(errors: FieldErrors<UploadFormValues>): boolean {
  return OVERVIEW_FIELDS.some((k) => Boolean(errors[k]));
}

function hasCampaignErrors(errors: FieldErrors<UploadFormValues>): boolean {
  return CAMPAIGN_FIELDS.some((k) => Boolean(errors[k]));
}

export function UploadForm() {
  const upload = useClipUpload();
  const [tab, setTab] = useState<TabValue>('overview');

  const submit = upload.form.handleSubmit(upload.onSubmit, (errors) => {
    if (hasOverviewErrors(errors)) setTab('overview');
    else if (hasCampaignErrors(errors)) setTab('campaign');
  });

  const overviewInvalid = hasOverviewErrors(upload.form.formState.errors);
  const campaignInvalid = hasCampaignErrors(upload.form.formState.errors);

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-6" noValidate>
      <UploadProgressOverlay
        open={upload.isSubmitting}
        steps={upload.uploadSteps}
      />

      {upload.file && upload.videoUrl ? (
        <VideoPreview
          videoUrl={upload.videoUrl}
          fileName={upload.file.name}
          fileSizeBytes={upload.file.size}
          metadata={upload.metadata}
          thumbnail={upload.thumbnail}
          isProcessing={upload.isProcessing}
          isGeneratingThumbnail={upload.isGeneratingThumbnail}
          onClear={upload.clearFile}
          onGenerateThumbnail={upload.generateThumbnailWithAI}
        />
      ) : (
        <UploadDropzone
          onFileSelected={upload.onFileSelected}
          isProcessing={upload.isProcessing}
        />
      )}

      {upload.validationError ? (
        <p className="text-destructive text-sm">{upload.validationError}</p>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger type="button" value="overview">
            <SparklesIcon />
            <span>Overview</span>
            {overviewInvalid ? <ErrorDot /> : null}
          </TabsTrigger>
          <TabsTrigger type="button" value="campaign">
            <CoinsIcon />
            <span>Campaign</span>
            {campaignInvalid ? <ErrorDot /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          forceMount
          className="mt-6 data-[state=inactive]:hidden"
        >
          <UploadOverviewTab upload={upload} />
        </TabsContent>

        <TabsContent
          value="campaign"
          forceMount
          className="mt-6 data-[state=inactive]:hidden"
        >
          <UploadCampaignTab upload={upload} />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={upload.clearFile}
          disabled={
            !upload.file ||
            upload.isProcessing ||
            upload.isGenerating ||
            upload.isSubmitting
          }
        >
          <Ban className="size-4" />
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={!upload.canSubmit || upload.isGenerating}
        >
          {upload.isSubmitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <UploadCloudIcon className="size-4" />
          )}
          Publish clip
        </Button>
      </div>
    </form>
  );
}

function ErrorDot() {
  return (
    <span
      aria-hidden
      className={cn('bg-destructive ml-1 inline-block size-1.5 rounded-full')}
    />
  );
}
