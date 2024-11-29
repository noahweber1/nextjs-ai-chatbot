// Store configuration with explicit JSON file paths
export const STORES = {
  'BearMattress': {
    url: 'www.bearmattress.com/products/elite-hybrid-mattress',
    contextFile: 'workspaces/nextjs-ai-chatbot/scrape-results/www.bearmattress.com_products_elite-hybrid-mattress-oZGiHEk0vlYn0576KJtzTYi87QInij.json'
  },
  'Wingman Store': {
    url: 'www.wingman-store.com/collections/headphones',
    contextFile: 'www.wingman.com-KoA1AcLvB2kbqBZiEZE6eqTt3smyQ0.json'
  }
} as const;

export type StoreKey = keyof typeof STORES;

// Type for store configuration
export interface StoreConfig {
  url: string;
  contextFile: string;
}

// Validate the STORES object
Object.entries(STORES).forEach(([key, config]) => {
  if (!config.url || !config.contextFile) {
    console.warn(`Missing URL or context file for store: ${key}`);
  }
});