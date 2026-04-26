import { useCallback, useEffect, useState } from 'react';
import {
  createParentItem,
  readParentItemsFromStorage,
  removeParentItem,
  upsertParentItem,
} from './storage';
import type { CreateParentItemInput, ParentItem } from './types';

export function useParentItems(childId = 'local-child') {
  const [items, setItems] = useState<ParentItem[]>([]);

  useEffect(() => {
    setItems(
      readParentItemsFromStorage().filter((item) => item.childId === childId),
    );
  }, [childId]);

  const saveItem = useCallback((item: ParentItem) => {
    const next = upsertParentItem(item);
    setItems(next.filter((candidate) => candidate.childId === childId));
  }, [childId]);

  const createItem = useCallback((input: CreateParentItemInput) => {
    const item = createParentItem({ ...input, childId });
    const next = upsertParentItem(item);
    setItems(next.filter((candidate) => candidate.childId === childId));
    return item;
  }, [childId]);

  const deleteItem = useCallback((itemId: string) => {
    const next = removeParentItem(itemId);
    setItems(next.filter((candidate) => candidate.childId === childId));
  }, [childId]);

  return {
    createItem,
    deleteItem,
    items,
    saveItem,
  };
}
