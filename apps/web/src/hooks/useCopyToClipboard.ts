'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface UseCopyToClipboardOptions {
  /** How long `copied` stays true after a successful copy, in ms. Default 1500. */
  resetMs?: number;
  /** Show a success toast after copy. Default false (CopyButton uses icon feedback). */
  successToast?: string | false;
  /** Show an error toast if copy fails. Default "Could not copy to clipboard". */
  errorToast?: string | false;
}

export interface UseCopyToClipboardResult {
  /** Copy a string to the clipboard. Resolves to `true` on success. */
  copy: (text: string) => Promise<boolean>;
  /** True briefly after a successful copy — drive icon swaps off this. */
  copied: boolean;
}

/**
 * Copy-to-clipboard primitive. Lives here (not inline in a component) per
 * CLAUDE.md "Architecture — Strict Logic / UI Separation".
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardResult {
  const {
    resetMs = 1500,
    successToast = false,
    errorToast = 'Could not copy to clipboard',
  } = options;

  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.clipboard?.writeText
        ) {
          throw new Error('Clipboard API is not available in this browser');
        }
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), resetMs);
        if (successToast) toast.success(successToast);
        return true;
      } catch (error) {
        console.error('[clipboard] copy failed', error);
        if (errorToast) toast.error(errorToast);
        return false;
      }
    },
    [resetMs, successToast, errorToast]
  );

  return { copy, copied };
}
