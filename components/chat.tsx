'use client';

import type { Message, CreateMessage, ChatRequestOptions, Attachment } from 'ai';
import { useChat } from 'ai/react';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useWindowSize } from 'usehooks-ts';

import { PreviewMessage, ThinkingMessage } from '@/components/message';
import { useScrollToBottom } from '@/components/use-scroll-to-bottom';
import type { Vote } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { type StoreKey } from '@/app/(chat)/store-types';
import {
  getSelectedStore,
  getStoreContextWithCache
} from '@/app/(chat)/actions';
import { Block, type UIBlock } from './block';
import { BlockStreamHandler } from './block-stream-handler';
import { MultimodalInput } from './multimodal-input';
import { Overview } from './overview';
import { StoreSelector } from './store-selector';

// Define ExtendedAttachment type
interface ExtendedAttachment extends Required<Attachment> {
  url: string;
  name: string;
  contentType: string;
}

interface ChatProps {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
}

export function Chat({ id, initialMessages, selectedModelId }: ChatProps) {
  const { mutate } = useSWRConfig();
  const [storeContext, setStoreContext] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<StoreKey | null>(null);
  const [attachments, setAttachments] = useState<Array<ExtendedAttachment>>([]);

  // Helper function to convert Attachment to ExtendedAttachment
  const asExtendedAttachment = (attachment: Attachment): ExtendedAttachment => ({
    ...attachment,
    url: attachment.url || '',
    name: attachment.name || '',
    contentType: attachment.contentType || '',
    id: attachment.id || crypto.randomUUID(),
    role: attachment.role || 'user',
  });

  // Create a type-safe wrapper for setAttachments
  const handleSetAttachments = useCallback((
    action: SetStateAction<ExtendedAttachment[]> | SetStateAction<Attachment[]>
  ) => {
    if (typeof action === 'function') {
      setAttachments(prevAttachments => {
        const result = action(prevAttachments as any);
        return Array.isArray(result) 
          ? result.map(asExtendedAttachment)
          : result;
      });
    } else {
      setAttachments(action.map(asExtendedAttachment));
    }
  }, []);

  useEffect(() => {
    async function initializeStore() {
      const store = await getSelectedStore();
      setSelectedStore(store);
      
      if (store) {
        const context = await getStoreContextWithCache(store);
        setStoreContext(context);
      }
    }
    
    initializeStore();
  }, []);

  const {
    messages,
    setMessages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
    append,
    data: streamingData,
  } = useChat({
    body: {
      id,
      modelId: selectedModelId,
      storeContext: storeContext || undefined,
    },
    initialMessages,
    onFinish: () => {
      mutate('/api/history');
    },
  });

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize();

  const [block, setBlock] = useState<UIBlock>({
    documentId: 'init',
    content: '',
    title: '',
    status: 'idle',
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const Header = () => (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <StoreSelector />
        <div className="h-6 w-px bg-muted" />
        <span className="text-sm text-muted-foreground">
          Model: {selectedModelId}
        </span>
      </div>
    </header>
  );

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <Header />
        <div
          ref={messagesContainerRef}
          className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
        >
          {messages.length === 0 ? (
            <Overview />
          ) : (
            <>
              {selectedStore && (
                <div className="px-4 py-2 mx-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Currently advising for: <strong>{selectedStore}</strong>
                  </p>
                </div>
              )}
              {messages.map((message, index) => (
                <PreviewMessage
                  key={message.id}
                  chatId={id}
                  message={message}
                  block={block}
                  setBlock={setBlock}
                  isLoading={isLoading && messages.length - 1 === index}
                  vote={votes?.find((vote) => vote.messageId === message.id)}
                />
              ))}
            </>
          )}

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' && (
              <ThinkingMessage />
            )}

          <div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
          />
        </div>

        <MultimodalInput
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          messages={messages}
          setMessages={setMessages}
          attachments={attachments}
          setAttachments={handleSetAttachments}
          append={append}
        />
      </div>

      <AnimatePresence>
        {block?.isVisible && (
          <Block
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={handleSetAttachments}
            append={append}
            block={block}
            setBlock={setBlock}
            messages={messages}
            setMessages={setMessages}
            votes={votes}
          />
        )}
      </AnimatePresence>

      <BlockStreamHandler streamingData={streamingData} setBlock={setBlock} />
    </>
  );
}