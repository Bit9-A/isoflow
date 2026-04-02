import { useMemo } from 'react';
import { ModelItem } from 'src/types';
import { useModelStore } from 'src/stores/modelStore';
import { getItemByIdOrThrow } from 'src/utils';

export const useModelItem = (id: string): ModelItem => {
  const model = useModelStore((state) => {
    return state;
  });

  const modelItem = useMemo(() => {
    const found = model.items.find((item) => {
      return item.id === id;
    });

    if (found) return found;

    // Fallback model item to prevent crash
    return {
      id,
      name: id,
      icon: 'block'
    };
  }, [id, model.items]);

  return modelItem;
};
