'use client';

import * as React from 'react';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Badge } from './badge';
import { Button } from './button';
import { CLIP_LIMITS } from '@/types/clip';

interface TagsInputProps extends Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value'
> {
  value: string[];
  onChange: (tags: string[]) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
}

function TagsInput({
  value,
  onChange,
  inputValue,
  onInputChange,
  className,
  disabled,
  ...props
}: TagsInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isMaxReached = value.length >= CLIP_LIMITS.maxTags;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && inputValue.trim() !== '') {
      e.preventDefault();
      const newTags = inputValue
        .trim()
        .split(' ')
        .filter((tag) => tag.length > 0);
      const uniqueNewTags = newTags
        .filter((tag) => !value.includes(tag.toLowerCase()))
        .slice(0, CLIP_LIMITS.maxTags - value.length);
      if (uniqueNewTags.length > 0) {
        onChange([...value, ...uniqueNewTags]);
      }
      onInputChange('');
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const focusInput = () => {
    if (!disabled && !isMaxReached) {
      inputRef.current?.focus();
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5',
          (disabled || isMaxReached) && 'cursor-not-allowed opacity-50'
        )}
        onClick={focusInput}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}

        {isMaxReached && (
          <span className="text-muted-foreground text-sm">
            Max {CLIP_LIMITS.maxTags} tags reached
          </span>
        )}
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isMaxReached}
        placeholder={
          isMaxReached
            ? `Max ${CLIP_LIMITS.maxTags} tags`
            : 'Type tags and press space or enter...'
        }
        {...props}
      />
    </div>
  );
}

export { TagsInput };
