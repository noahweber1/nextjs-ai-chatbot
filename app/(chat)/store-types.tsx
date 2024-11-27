// Store configuration
export const STORES = {
    'Bear Mattress': 'www.bearmattress.com',
    'Wingman Store': 'wingman-store.com',
  } as const;
  
  export type StoreKey = keyof typeof STORES;
  
  // Types
  export interface StoreContext {
    store: StoreKey;
    data: string;
    timestamp: string;
  }
  
  export interface StoreMetadata {
    name: StoreKey;
    domain: string;
    lastUpdated: string;
  }