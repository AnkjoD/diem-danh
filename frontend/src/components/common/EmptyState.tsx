import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  sx?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = <InboxIcon sx={{ fontSize: 64, opacity: 0.2 }} />, 
  title = "Chưa có dữ liệu", 
  message,
  sx = {}
}) => {
  return (
    <Paper sx={{ 
      p: 4, 
      textAlign: 'center', 
      borderRadius: 3, 
      bgcolor: 'rgba(255,255,255,0.02)',
      border: '1px dashed rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      ...sx 
    }}>
      <Box sx={{ color: 'primary.main' }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
            {message}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
