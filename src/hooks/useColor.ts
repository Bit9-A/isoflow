import { useMemo } from 'react';
import { getItemByIdOrThrow } from 'src/utils';
import { useScene } from 'src/hooks/useScene';

export const useColor = (colorId?: string) => {
  const { colors } = useScene();

  const color = useMemo(() => {
    if (colorId === undefined) {
      if (colors.length > 0) {
        return colors[0];
      }

      throw new Error('No colors available.');
    }

    const found = colors.find((c) => {
      return c.id === colorId;
    });

    if (found) return found;

    if (colors.length > 0) {
      return colors[0];
    }

    throw new Error('No colors available.');
  }, [colorId, colors]);

  return color;
};
