'use client';

import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import cx from 'classnames';
import { motion } from 'framer-motion';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { sanitizeUIMessages } from '@/lib/utils';
import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

const suggestedActions = [
  {
    title: 'Chat about Bear Mattresses',
    label: 'Ask about their products',
    action: 'Tell me about Bear Mattress products and their features',
  },
  {
    title: 'Chat about Wingman',
    label: 'Learn about headphones',
    action: 'What headphones does Wingman Store offer and what are their features?',
  },
] as const;

interface MultimodalInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (event?: { preventDefault?: () => void }, options?: ChatRequestOptions) => void;
  isLoading: boolean;
  messages: Message[];
  attachments: Attachment[];
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  setInput: Dispatch<SetStateAction<string>>;
}

export function MultimodalInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  attachments,
  handleFileUpload,
  setInput,
}: MultimodalInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [lastSubmittedMessage, setLastSubmittedMessage] = useLocalStorage(
    'last-submitted-message',
    '',
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setShowSuggestions(false);
    }
  }, [messages.length]);

  useEffect(() => {
    if (input && !hasScrolled && inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: 'smooth' });
      setHasScrolled(true);
    }
  }, [input, hasScrolled]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!input || isLoading) return;
        handleSubmit(undefined, {});
        setLastSubmittedMessage(input);
      }
    },
    [handleSubmit, input, isLoading, setLastSubmittedMessage],
  );

  const handleSuggestedAction = useCallback(
    (action: string) => {
      setInput(action);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [setInput],
  );

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-t from-white from-50% to-transparent dark:from-zinc-900 pb-4 md:pb-8"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        {showSuggestions && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 px-4">
            {suggestedActions.map(({ title, label, action }) => (
              <Button
                key={title}
                variant="outline"
                onClick={() => handleSuggestedAction(action)}
              >
                <span className="font-semibold">{title}</span>
                <span className="ml-1 text-zinc-400">{label}</span>
              </Button>
            ))}
          </div>
        )}

        <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-white px-4 sm:rounded-2xl sm:border sm:px-8 dark:bg-zinc-900 dark:border-zinc-700">
          <div className="absolute left-4 top-4 sm:left-8">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => uploadRef.current?.click()}
            >
              <PaperclipIcon size={16} />
            </Button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <Textarea
            ref={inputRef}
            tabIndex={0}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message"
            spellCheck={false}
            className="min-h-[48px] w-full resize-none bg-transparent px-12 py-4 focus-visible:ring-0"
            aria-label="Chat input"
            role="textbox"
            aria-multiline="true"
          />

          <div className="absolute right-4 top-4 sm:right-8">
            <Button
              type="submit"
              size="icon"
              className="size-6"
              disabled={!input || isLoading}
              onClick={() => {
                handleSubmit(undefined, {});
                setLastSubmittedMessage(input);
              }}
            >
              {isLoading ? (
                <StopIcon size={16} />
              ) : (
                <ArrowUpIcon size={16} />
              )}
            </Button>
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="mt-4 flex items-center gap-2 px-4">
            {attachments.map((attachment) => (
              <PreviewAttachment
                key={attachment.id}
                attachment={attachment}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}