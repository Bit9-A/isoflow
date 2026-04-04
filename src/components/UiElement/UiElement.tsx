import React from 'react';
import { Card, SxProps } from '@mui/material';

interface Props {
  children: React.ReactNode;
  sx?: SxProps;
  style?: React.CSSProperties;
}

export const UiElement = ({ children, sx, style }: Props) => {
  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        borderColor: '#e2e8f0',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1.5px',
          background: 'linear-gradient(to bottom right, rgba(255,255,255,0.4), rgba(255,255,255,0.05))',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          pointerEvents: 'none'
        },
        ...sx
      }}
      style={style}
    >
      {children}
    </Card>
  );
};
