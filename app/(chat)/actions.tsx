'use server';

import { type CoreUserMessage, generateText } from 'ai';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { type StoreKey, STORES } from './store-types';

// Environment variables with type safety
const BLOB_BASE_URL = process.env.BLOB_BASE_URL;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

// Type definitions
interface CacheEntry {
  data: string;
  timestamp: number;
}

interface ScrapedContent {
  content: string;
  metadata: {
    url: string;
    timestamp: string;
    pageCount: number;
  };
}

// Cache implementation
const contextCache = new Map<StoreKey, CacheEntry>();

// Model actions
export async function saveModelId(model: string): Promise<void> {
  if (!models.find(m => m.id === model)) {
    throw new Error('Invalid model');
  }
  const cookieStore = await cookies();
  cookieStore.set('model-id', model);
}

// Store selection actions
export async function setSelectedStore(store: StoreKey | null): Promise<void> {
  const cookieStore = await cookies();
  if (store) {
    cookieStore.set('selected-store', store);
  } else {
    cookieStore.delete('selected-store');
  }
  revalidatePath('/');
}

export async function getSelectedStore(): Promise<StoreKey | null> {
  const cookieStore = await cookies();
  const store = cookieStore.get('selected-store')?.value as StoreKey | undefined;
  return store || null;
}

export async function getStoreContext(store: StoreKey | null): Promise<string> {
  if (!store) return '';
  if (!BLOB_BASE_URL) {
    console.warn('BLOB_BASE_URL environment variable is not configured');
    return '';
  }
  
  try {
    // First validate that the store exists in STORES
    if (!(store in STORES)) {
      console.warn(`Invalid store key: ${store}`);
      return '';
    }

    const storeConfig = STORES[store];
    
    // Debug log
    console.log('Processing store:', store);
    console.log('Store config:', storeConfig);

    // Construct the blob URL using the explicit file path
    const blobUrl = new URL(
      storeConfig.contextFile,
      BLOB_BASE_URL
    );
    
    console.log('Fetching context from:', blobUrl.toString());
    
    const response = await fetch(blobUrl.toString(), {
      next: { 
        revalidate: 3600,
        tags: [`store-${store}`],
      },
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`No context found for store: ${store} at ${blobUrl}`);
        return '';
      }
      throw new Error(`Failed to fetch context: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return await formatScrapedContent(data, store);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error loading store context:', errorMessage);
    console.error('Store:', store);
    console.error('STORES:', STORES);
    return '';
  }
}

export async function uploadStoreContext(
  store: StoreKey, 
  contextData: string
): Promise<string> {
  if (!store || !contextData) {
    throw new Error('Store and context data are required');
  }

  try {
    // Validate store exists
    if (!(store in STORES)) {
      throw new Error(`Invalid store key: ${store}`);
    }

    const storeConfig = STORES[store];
    const blobPath = storeConfig.contextFile;
    
    const content: ScrapedContent = {
      content: contextData,
      metadata: {
        url: storeConfig.url,
        timestamp: new Date().toISOString(),
        pageCount: 1
      }
    };

    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json',
    });

    const { url } = await put(blobPath, blob, {
      access: 'public',
      addRandomSuffix: false,
    });

    contextCache.delete(store);
    revalidatePath('/');
    
    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error uploading store context:', errorMessage);
    console.error('Store:', store);
    console.error('STORES:', STORES);
    throw new Error(`Failed to upload store context: ${errorMessage}`);
  }
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: CoreUserMessage;
}): Promise<string> {
  try {
    const { text: title } = await generateText({
      model: customModel('gpt-4'),
      system: `
        Generate a short title based on the first message a user begins a conversation with.
        Requirements:
        - Maximum 80 characters
        - Concise summary of user's message
        - No quotes or colons
        - Use active voice
        - Be descriptive but brief
      `,
      prompt: JSON.stringify(message),
    });

    return title.trim();
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Conversation';
  }
}

export async function getStoreContextWithCache(store: StoreKey): Promise<string> {
  const now = Date.now();
  const cached = contextCache.get(store);
  
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const context = await getStoreContext(store);
  contextCache.set(store, { data: context, timestamp: now });
  return context;
}

export async function getAvailableStores(): Promise<Array<{
  name: StoreKey;
  domain: string;
  lastUpdated: string;
}>> {
  return Object.entries(STORES).map(([name, config]) => ({
    name: name as StoreKey,
    domain: config.url,
    lastUpdated: new Date().toISOString(),
  }));
}

export async function validateStore(store: string): Promise<boolean> {
  return store in STORES;
}

// Helper function to format the scraped content
async function formatScrapedContent(
  data: any, 
  store: StoreKey
): Promise<string> {
  if (!data?.content) return '';
  
  try {
    const formattedContext = [
      `Store Context for ${store}:`,
      `Website: ${STORES[store].url}`,
      `Last Updated: ${data.metadata?.timestamp || 'Unknown'}`,
      '',
      'Content:',
      data.content,
      '',
      'Instructions:',
      '- Use this context to provide accurate information about the store\'s products and services',
      '- Only reference information that is present in this context',
      '- If information is not available in the context, acknowledge that',
      data.metadata?.pageCount ? `- Content was scraped from ${data.metadata.pageCount} pages` : ''
    ].filter(Boolean).join('\n');

    return formattedContext.trim();
  } catch (error) {
    console.error('Error formatting scraped content:', error);
    return data.content || '';
  }
}