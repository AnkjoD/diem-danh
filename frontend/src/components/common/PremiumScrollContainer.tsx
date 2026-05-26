import React, { ReactNode } from 'react';
import { Box, TableContainer, Paper, SxProps, Theme } from '@mui/material';
import { premiumScrollbarStyles } from '../../theme/scrollbar.styles';

interface PremiumScrollContainerProps {
  children: ReactNode;
  maxHeight?: string | number;
  borderRadius?: number;
  sx?: SxProps<Theme>;
  component?: 'box' | 'tableContainer';
  variant?: 'elevation' | 'outlined';
}

/**
 * A highly reusable container that applies the premium floating scrollbar styles.
 * Use it for tables, lists, or any scrollable content.
 */
export const PremiumScrollContainer: React.FC<PremiumScrollContainerProps> = ({
  children,
  maxHeight = 'calc(100vh - 160px)',
  borderRadius = 3,
  sx = {},
  component = 'tableContainer',
  variant = 'elevation',
}) => {
  const baseStyles: SxProps<Theme> = {
    ...premiumScrollbarStyles,
    maxHeight,
    borderRadius,
    position: 'relative',
    ...(sx as any), // Cast to any to avoid complex SxProps nesting errors
  };

  if (component === 'tableContainer') {
    return (
      <TableContainer
        component={Paper}
        sx={{
          ...baseStyles,
          ...(variant === 'outlined' && {
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'none',
          }),
        }}
      >
        {children}
      </TableContainer>
    );
  }

  return (
    <Box sx={{
      ...baseStyles,
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(auto-fill, minmax(300px, 1fr))',
        md: 'repeat(auto-fill, minmax(320px, 1fr))',
      },
      gap: 3,
    }}>
      {children}
    </Box>
  );
};
