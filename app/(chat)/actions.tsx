'use server';

import { type CoreUserMessage, generateText } from 'ai';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { type StoreKey, STORES } from './store-types';

// Define base URL for blob storage
const BLOB_BASE_URL = process.env.BLOB_BASE_URL || 'https://your-blob-storage-url.com';

// Model actions
export async function saveModelId(model: string) {
  if (!models.find(m => m.id === model)) {
    throw new Error('Invalid model');
  }
  const cookieStore = await cookies();
  cookieStore.set('model-id', model);
}

// Store selection actions
export async function setSelectedStore(store: StoreKey | null) {
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

// Store context actions with direct URL access
export async function getStoreContext(store: StoreKey | null) {
  if (!store) return '';
  
  try {
    const blobUrl = `${BLOB_BASE_URL}/store-contexts/${store.toLowerCase().replace(' ', '-')}.json`;
    
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch context: ${response.statusText}`);
    }
    
    const contextData = await response.json();
    return await formatContextData(contextData, store);
  } catch (error) {
    console.error('Error loading store context:', error);
    return '';
  }
}

// Upload context to blob storage
export async function uploadStoreContext(store: StoreKey, contextData: any) {
  try {
    const blobPath = `store-contexts/${store.toLowerCase().replace(' ', '-')}.json`;
    const blob = new Blob([JSON.stringify(contextData, null, 2)], {
      type: 'application/json',
    });

    const { url } = await put(blobPath, blob, {
      access: 'public',
      addRandomSuffix: false,
    });

    return url;
  } catch (error) {
    console.error('Error uploading store context:', error);
    throw error;
  }
}

// Title generation action
export async function generateTitleFromUserMessage({
  message,
}: {
  message: CoreUserMessage;
}) {
  const { text: title } = await generateText({
    model: customModel('gpt-4'),
    system: `
      - Generate a short title based on the first message a user begins a conversation with
      - Ensure it is not more than 80 characters long
      - The title should be a summary of the user's message
      - Do not use quotes or colons
    `,
    prompt: JSON.stringify(message),
  });

  return title;
}

// Cache implementation
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const contextCache = new Map<StoreKey, { data: string; timestamp: number }>();

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

// Helper function to format context data
async function formatContextData(data: any, store: StoreKey): Promise<string> {
  if (!data) return '';
  
  try {
    const {
      title,
      description,
      products,
      categories,
      ...otherData
    } = data;

    return `
      Store Context for ${store}:
      Website: ${STORES[store]}
      
      ${title ? `Store Name: ${title}\n` : ''}
      ${description ? `Description: ${description}\n` : ''}
      ${products ? `Products: ${JSON.stringify(products, null, 2)}\n` : ''}
      ${categories ? `Categories: ${JSON.stringify(categories, null, 2)}\n` : ''}
      ${Object.entries(otherData)
        .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
        .join('\n')}
      
      Instructions:
      - Use this context to provide accurate information about the store's products and services
      - Only reference information that is present in this context
      - If information is not available in the context, acknowledge that
    `.trim();
  } catch (error) {
    console.error('Error formatting context data:', error);
    return JSON.stringify(data, null, 2);
  }
}

// Utility function to get all available stores
export async function getAvailableStores() {
  return Object.entries(STORES).map(([name, domain]) => ({
    name: name as StoreKey,
    domain,
    lastUpdated: new Date().toISOString(),
  }));
}

// Validation helper - now async
export async function isValidStore(store: string): Promise<store is StoreKey> {
  return store in STORES;
}