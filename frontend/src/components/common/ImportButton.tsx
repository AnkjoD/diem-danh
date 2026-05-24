import React, { useRef } from 'react';
import { Button, Tooltip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ImportButtonProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
  tooltip?: string;
  accept?: string;
  multiple?: boolean;
}

export const ImportButton: React.FC<ImportButtonProps> = ({ 
  onFileSelect, 
  disabled = false, 
  label = "Nhập Excel/CSV", 
  tooltip = "Yêu cầu cột: MSSV (Mã SV), Họ Tên (Tên). Tùy chọn: Email, SĐT.",
  accept = ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
  multiple = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e);
    // Reset input để có thể chọn lại cùng file
    if (inputRef.current) inputRef.current.value = '';
  };

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
          ref={inputRef}
          type="file" 
          hidden 
          accept={accept}
          multiple={multiple}
          aria-label={label}
          onChange={handleChange}
        />
      </Button>
    </Tooltip>
  );
};
