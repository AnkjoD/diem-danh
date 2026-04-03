import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, FormControlLabel, Checkbox, Box, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: (archive?: boolean) => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  showArchiveOption?: boolean;
  archiveLabel?: string;
}

export default function ConfirmDialog({
  open, title, message, onConfirm, onCancel, confirmLabel = 'Xác nhận xóa', cancelLabel = 'Hủy', isPending = false,
  showArchiveOption = false, archiveLabel = 'Lưu trữ ảnh để huấn luyện AI'
}: ConfirmDialogProps) {
  const [archive, setArchive] = useState(true);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(archive);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, archive, onConfirm]);

  return (
    <Dialog open={open} onClose={onCancel} PaperProps={{
      sx: {
        background: 'linear-gradient(to bottom, #2a0a4a, #1a0532)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        minWidth: 400
      }
    }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: '"Cinzel", serif', color: '#ffaaaa', pt: 3, pb: 1 }}>
        <WarningAmberIcon color="error" fontSize="large" sx={{ opacity: 0.9 }} /> 
        {title}
      </DialogTitle>
      
      <DialogContent sx={{ pb: 1 }}>
        <DialogContentText sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.05rem', lineHeight: 1.6, mb: 2 }}>
          {message.split('\n').map((line, i) => (
            <span key={i}>{line}<br/></span>
          ))}
        </DialogContentText>
        
        {showArchiveOption && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', border: '1px border-dashed rgba(255,255,255,0.1)' }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={archive} 
                  onChange={(e) => setArchive(e.target.checked)}
                  sx={{ color: 'primary.light', '&.Mui-checked': { color: 'primary.light' } }}
                />
              }
              label={archiveLabel}
              sx={{ color: 'rgba(255,255,255,0.9)' }}
            />
            <Typography variant="caption" display="block" sx={{ ml: 4, color: 'rgba(255,255,255,0.5)' }}>
              Nếu chọn, ảnh sẽ được chuyển vào thư mục riêng thay vì bị xóa vĩnh viễn.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onCancel} sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, px: 3 }} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button 
          onClick={() => onConfirm(archive)} 
          variant="contained" 
          disabled={isPending} 
          sx={{
            background: 'linear-gradient(45deg, #d32f2f, #f44336)',
            boxShadow: '0 4px 14px rgba(211, 47, 47, 0.4)',
            fontWeight: 600,
            px: 3,
            '&:hover': { 
              background: 'linear-gradient(45deg, #b71c1c, #d32f2f)',
            }
          }}
        >
          {isPending ? 'Đang xử lý...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
