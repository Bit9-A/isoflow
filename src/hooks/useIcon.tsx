import React, { useMemo, useEffect } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { getItemByIdOrThrow } from 'src/utils';
import { IsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon';
import { NonIsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/NonIsometricIcon';
import { DEFAULT_ICON } from 'src/config';

export const useIcon = (id: string | undefined) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const icon = useMemo(() => {
    if (!id) return DEFAULT_ICON;

    const found = icons.find((i) => {
      return i.id === id;
    });

    if (found) return found;

    // Fallback to 'block' icon or DEFAULT_ICON if not found
    return (
      icons.find((i) => {
        return i.id === 'block';
      }) ?? DEFAULT_ICON
    );
  }, [icons, id]);

  useEffect(() => {
    setHasLoaded(false);
  }, [icon.url]);

  const iconComponent = useMemo(() => {
    if (!icon.isIsometric) {
      setHasLoaded(true);
      return <NonIsometricIcon icon={icon} />;
    }

    return (
      <IsometricIcon
        url={icon.url}
        onImageLoaded={() => {
          setHasLoaded(true);
        }}
      />
    );
  }, [icon]);

  return {
    icon,
    iconComponent,
    hasLoaded
  };
};
