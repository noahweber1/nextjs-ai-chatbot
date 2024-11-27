'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useWindowSize } from 'usehooks-ts';

import { ChatHeader } from '@/components/chat-header';
import { PreviewMessage, ThinkingMessage } from '@/components/message';
import { useScrollToBottom } from '@/components/use-scroll-to-bottom';
import type { Vote } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { 
  type StoreKey 
} from '@/app/(chat)/store-types';
import {
  getSelectedStore,
  getStoreContext,
  getStoreContextWithCache
} from '@/app/(chat)/actions';
import { Block, type UIBlock } from './block';
import { BlockStreamHandler } from './block-stream-handler';
import { MultimodalInput } from './multimodal-input';
import { Overview } from './overview';
import { StoreSelector } from './store-selector';

interface ChatProps {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
}

export function Chat({ id, initialMessages, selectedModelId }: ChatProps) {
  const { mutate } = useSWRConfig();
  const [storeContext, setStoreContext] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<StoreKey | null>(null);

  // Fetch initial store selection and context
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
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
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

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  // Custom header component with store selector
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

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        </form>
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
            setAttachments={setAttachments}
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