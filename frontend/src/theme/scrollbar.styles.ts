import { SxProps, Theme } from '@mui/material';

/**
 * Premium "Floating Capsule" scrollbar styles for a modern, high-end dashboard look.
 * Optimized for Webkit browsers (Chrome, Edge, Safari).
 * 
 * Includes:
 * 1. overflowY: 'overlay' to prevent layout shifting and allow full-width headers.
 * 2. 16px vertical offsets (Safe-Zone) to stay clear of rounded corners.
 * 3. Gradient thumb and perfectly circular ends.
 */
export const premiumScrollbarStyles: SxProps<Theme> = {
  overflowY: 'overlay',
  pr: 0, // Ensure content spans to the edge
  '&::-webkit-scrollbar': { 
    width: '8px' 
  },
  '&::-webkit-scrollbar-track': { 
    background: 'transparent' 
  },
  '&::-webkit-scrollbar-thumb': { 
    background: 'linear-gradient(to bottom, #a855f7, #ec4899)', 
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb:hover': { 
    background: 'linear-gradient(to bottom, #c084fc, #f472b6)', 
  },
  // Vertical offsets using transparent scrollbar buttons
  '&::-webkit-scrollbar-button:vertical:start:increment': { 
    display: 'block', 
    height: '16px' 
  },
  '&::-webkit-scrollbar-button:vertical:end:increment': { 
    display: 'block', 
    height: '16px' 
  }
};
