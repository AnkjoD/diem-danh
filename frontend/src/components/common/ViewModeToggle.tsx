import React from 'react';
import { ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { TableRows as TableIcon, GridView as GridIcon } from '@mui/icons-material';

interface ViewModeToggleProps {
  value: 'table' | 'grid';
  onChange: (value: 'table' | 'grid') => void;
  title?: string;
}

/**
 * A standardized toggle for switching between list views (Table vs Grid).
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  value,
  onChange,
  title = 'Chế độ hiển thị',
}) => {
  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextView: 'table' | 'grid' | null,
  ) => {
    if (nextView !== null) {
      onChange(nextView);
    }
  };

  return (
    <Tooltip title={title}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleViewChange}
        size="small"
        sx={{
          bgcolor: 'rgba(168, 85, 247, 0.05)',
          '& .MuiToggleButton-root': {
            px: 2,
            border: '1px solid rgba(168, 85, 247, 0.1)',
            '&.Mui-selected': {
              bgcolor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              '&:hover': {
                bgcolor: 'rgba(168, 85, 247, 0.25)',
              }
            }
          }
        }}
      >
        <ToggleButton value="table">
          <TableIcon fontSize="small" sx={{ mr: 1 }} /> Danh sách
        </ToggleButton>
        <ToggleButton value="grid">
          <GridIcon fontSize="small" sx={{ mr: 1 }} /> Lưới
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
};
