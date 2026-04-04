import React, { useMemo } from 'react';
import { Button, Box, useTheme } from '@mui/material';
import Tooltip, { TooltipProps } from '@mui/material/Tooltip';

interface Props {
  name: string;
  Icon: React.ReactNode;
  isActive?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tooltipPosition?: TooltipProps['placement'];
  disabled?: boolean;
}

export const IconButton = ({
  name,
  Icon,
  onClick,
  isActive = false,
  disabled = false,
  tooltipPosition = 'bottom'
}: Props) => {
  const theme = useTheme();
  const iconColor = useMemo(() => {
    if (isActive) {
      return 'grey.200';
    }

    if (disabled) {
      return 'grey.800';
    }

    return 'grey.500';
  }, [disabled, isActive]);

  return (
    <Tooltip
      title={name}
      placement={tooltipPosition}
      enterDelay={1000}
      enterNextDelay={1000}
      arrow
      sx={{ bgcolor: 'primary.main' }}
    >
      <Button
        variant="text"
        onClick={onClick}
        sx={{
          borderRadius: 1.5,
          height: theme.customVars.toolMenu.height,
          width: theme.customVars.toolMenu.height,
          maxWidth: '100%',
          minWidth: 'auto',
          bgcolor: isActive ? 'primary.light' : 'transparent',
          color: isActive ? 'white' : iconColor,
          p: 0,
          m: 0,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            bgcolor: isActive ? 'primary.main' : 'grey.100',
            transform: 'scale(1.05)'
          },
          '&:active': {
            transform: 'scale(0.95)'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            svg: {
              color: 'inherit',
              fontSize: 18
            }
          }}
        >
          {Icon}
        </Box>
      </Button>
    </Tooltip>
  );
};
