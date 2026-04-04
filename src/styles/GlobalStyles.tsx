import React from 'react';
import { GlobalStyles as MUIGlobalStyles } from '@mui/material';
import 'react-quill/dist/quill.snow.css';

export const GlobalStyles = () => {
  return (
    <MUIGlobalStyles
      styles={{
        '*': {
          boxSizing: 'border-box',
          fontFamily: '"Outfit", sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        },
        body: {
          margin: 0,
          padding: 0,
          fontFamily: '"Outfit", sans-serif'
        }
      }}
    />
  );
};
