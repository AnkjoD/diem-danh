import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { registerStudentFace } from '@/common/api/student';
import { StudentData } from '@/common/interfaces/student';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface FaceRegistrationProps {
  student: StudentData;
  open: boolean;
  onClose: () => void;
  onRegistered: () => void;
}

const FaceRegistration: React.FC<FaceRegistrationProps> = ({ student, open, onClose, onRegistered }) => {
  const [file, setFile] = useState<File | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const registerMut = useMutation({
    mutationFn: (f: File) => registerStudentFace(student.id, f),
    onSuccess: () => {
      onRegistered();
    }
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setUseCamera(true);
      setFile(null); // Clear any existing file if turning on camera
    } catch (e) {
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền sử dụng!');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
      if (blob) {
        const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    if (useCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [useCamera]);

  useEffect(() => {
    return stopCamera;
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input (though there are none in this dialog, good practice)
      if (document.activeElement?.tagName === 'INPUT') return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        if (useCamera) capturePhoto();
        else if (file && !registerMut.isPending) registerMut.mutate(file);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, useCamera, file, registerMut.isPending]);

  const handleClose = (event?: any, reason?: string) => {
    if (reason === 'escapeKeyDown' && useCamera) {
      stopCamera();
      return; // Prevent dialog from closing on first Escape
    }
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle fontFamily='"Cinzel", serif'>Đăng ký khuôn mặt - {student.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 3 }}>
            <Typography color="text.secondary" textAlign="center">
              Bạn có thể tải ảnh có sẵn hoặc dùng webcam để chụp trực tiếp.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <Button component="label" variant={file && !useCamera ? "contained" : "outlined"} startIcon={<CloudUploadIcon />} color="primary">
                Tải File Lên
                <input type="file" accept="image/*" hidden aria-label="Tải ảnh lên" onChange={(e) => { setFile(e.target.files?.[0] || null); stopCamera(); }} />
              </Button>
              
              {!useCamera ? (
                <Button variant="outlined" color="secondary" onClick={startCamera} startIcon={<CameraAltIcon />}>
                  Mở Webcam
                </Button>
              ) : (
                <Button variant="outlined" color="error" onClick={stopCamera}>
                  Đóng Webcam
                </Button>
              )}
            </Box>

            {useCamera && (
              <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
                <Button variant="contained" color="secondary" fullWidth onClick={capturePhoto} sx={{ borderRadius: 0, py: 1.5 }}>
                  📸 CHỤP ẢNH NGAY (Enter)
                </Button>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </Box>
            )}

            {file && !useCamera && (
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Alert severity="success" sx={{ width: '100%' }}>
                  {file.name.startsWith('capture_') 
                    ? 'Đã chụp ảnh thành công! Hãy xem trước ảnh ở dưới.' 
                    : `Đã đính kèm ảnh: ${file.name}`}
                </Alert>
                <Box sx={{ width: '100%', maxWidth: 320, borderRadius: 2, overflow: 'hidden', border: '2px solid rgba(168,85,247,0.5)', boxShadow: 2 }}>
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Face Preview" 
                    style={{ width: '100%', display: 'block', transform: file.name.startsWith('capture_') ? 'scaleX(-1)' : 'none' }} 
                  />
                </Box>
              </Box>
            )}

            {registerMut.isError && (
               <Alert severity="error" sx={{ width: '100%' }}>
                 Lỗi AI: {registerMut.error.message}
               </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={registerMut.isPending}>Huỷ (Esc)</Button>
          <Button 
            onClick={() => file && registerMut.mutate(file)}
            variant="contained" 
            disabled={!file || registerMut.isPending} 
          >
            {registerMut.isPending ? <CircularProgress size={24} /> : 'Xác nhận (Enter)'}
          </Button>
        </DialogActions>
    </Dialog>
  );
};

export default FaceRegistration;
