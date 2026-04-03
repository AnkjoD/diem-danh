import React from 'react';
import { Button, Tooltip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ImportButtonProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
  tooltip?: string;
  accept?: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({ 
  onFileSelect, 
  disabled = false, 
  label = "Nhập Excel/CSV", 
  tooltip = "Tên cột: mssv, name, email, phone",
  accept = ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
}) => {
  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Button 
        variant="outlined" 
        component="label" 
        startIcon={<CloudUploadIcon />}
        disabled={disabled}
        sx={{ borderRadius: 2 }}
      >
        {label}
        <input 
          type="file" 
          hidden 
          accept={accept} 
          onChange={onFileSelect} 
        />
      </Button>
    </Tooltip>
  );
};
