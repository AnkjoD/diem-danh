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
  const [files, setFiles] = useState<File[]>([]);
  const [useCamera, setUseCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleConfirm = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      for (const f of files) {
        await registerStudentFace(student.id, f);
      }
      onRegistered();
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi: Không thể đăng ký một trong các ảnh');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setUseCamera(true);
      // setFiles([]); // Don't clear existing files when opening camera, so they can mix uploads and captures
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
        setFiles(prev => [...prev, capturedFile]);
        // Không stopCamera() để người dùng có thể chụp nhiều ảnh liên tục
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
        else if (files.length > 0 && !isProcessing) handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, useCamera, files, isProcessing]);

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
              <Button component="label" variant={files.length > 0 && !useCamera ? "contained" : "outlined"} startIcon={<CloudUploadIcon />} color="primary">
                Tải File Lên (Nhiều ảnh)
                <input type="file" accept="image/*" multiple hidden aria-label="Tải ảnh lên" onChange={(e) => { 
                  if (e.target.files) {
                    const newFiles = Array.from(e.target.files);
                    setFiles(prev => [...prev, ...newFiles]);
                  }
                  stopCamera(); 
                }} />
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

            {files.length > 0 && (
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Alert severity="success" sx={{ width: '100%' }}>
                  Đã thêm {files.length} ảnh. Bạn có thể chụp thêm hoặc tải thêm.
                </Alert>
                <Box sx={{ width: '100%', display: 'flex', overflowX: 'auto', gap: 2, p: 1, border: '2px solid rgba(168,85,247,0.3)', borderRadius: 2 }}>
                  {files.map((f, idx) => (
                    <Box key={idx} sx={{ minWidth: 120, position: 'relative', borderRadius: 2, overflow: 'hidden', boxShadow: 2 }}>
                      <img 
                        src={URL.createObjectURL(f)} 
                        alt="Face Preview" 
                        style={{ width: 120, height: 160, objectFit: 'cover', display: 'block', transform: f.name.startsWith('capture_') ? 'scaleX(-1)' : 'none' }} 
                      />
                      <Button 
                        size="small" 
                        color="error" 
                        variant="contained" 
                        sx={{ minWidth: 0, p: 0.5, position: 'absolute', top: 4, right: 4, borderRadius: '50%' }}
                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        X
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {errorMsg && (
               <Alert severity="error" sx={{ width: '100%' }}>
                 {errorMsg}
               </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isProcessing}>Huỷ (Esc)</Button>
          <Button 
            onClick={handleConfirm}
            variant="contained" 
            disabled={files.length === 0 || isProcessing} 
          >
            {isProcessing ? <CircularProgress size={24} /> : 'Đăng ký các ảnh (Enter)'}
          </Button>
        </DialogActions>
    </Dialog>
  );
};

export default FaceRegistration;
