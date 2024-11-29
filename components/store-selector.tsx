'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type StoreKey, STORES } from '@/app/(chat)/store-types';
import { setSelectedStore } from '@/app/(chat)/actions';

export function StoreSelector() {
  const router = useRouter();
  const stores = Object.keys(STORES) as StoreKey[];

  const handleStoreChange = useCallback(async (store: StoreKey) => {
    console.log('Store selected:', store);
    await setSelectedStore(store);
    router.refresh();
  }, [router]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        Which store are you advising?
      </span>
      <Select onValueChange={handleStoreChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select store..." />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store} value={store}>
              {store}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}