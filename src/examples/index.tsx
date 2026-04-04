import React, { useState, useMemo } from 'react';
import { Box, Select, MenuItem, useTheme } from '@mui/material';
import { BasicEditor } from './BasicEditor/BasicEditor';
import { DebugTools } from './DebugTools/DebugTools';
import { ReadonlyMode } from './ReadonlyMode/ReadonlyMode';

const examples = [
  { name: 'Basic editor', component: BasicEditor },
  { name: 'Debug tools', component: DebugTools },
  { name: 'Read-only mode', component: ReadonlyMode }
];

export const Examples = () => {
  const theme = useTheme();
  const [currentExample, setCurrentExample] = useState(0);

  const Example = useMemo(() => {
    return examples[currentExample].component;
  }, [currentExample]);

  return (
    <Box sx={{ width: '100vw', height: '100vh' }}>
      <Box sx={{ width: '100%', height: '100%' }}>{Example && <Example />}</Box>
      <Select
        sx={{
          position: 'absolute',
          top: 20,
          left: 100,
          minWidth: 160,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          fontFamily: '"Outfit", sans-serif',
          fontSize: '0.85rem',
          fontWeight: 600,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.1)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: '1.5px'
          }
        }}
        value={currentExample}
        onChange={(e) => {
          setCurrentExample(e.target.value as number);
        }}
        variant="outlined"
        size="small"
      >
        {examples.map((example, i) => {
          return (
            <MenuItem 
              key={example.name} 
              value={i}
              sx={{ 
                fontFamily: '"Outfit", sans-serif',
                fontSize: '0.85rem'
              }}
            >
              {example.name}
            </MenuItem>
          );
        })}
      </Select>
    </Box>
  );
};
