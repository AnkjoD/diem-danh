import React from 'react';
import { Box, Typography } from '@mui/material';

interface SectionHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actions }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, 
      justifyContent: 'space-between', 
      alignItems: { xs: 'flex-start', md: 'center' }, 
      gap: 2, 
      mb: 3 
    }}>
      <Typography variant="h4" fontFamily='"Cinzel", serif'>
        {title}
      </Typography>
      {actions && (
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap', 
          alignItems: 'center',
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'flex-start', md: 'flex-end' }
        }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};
