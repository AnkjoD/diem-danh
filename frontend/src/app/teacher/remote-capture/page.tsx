'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Box, Typography, Button, Container, Paper, Avatar, List, ListItem, 
  ListItemAvatar, ListItemText, CircularProgress, Alert, IconButton, Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { recognizeAttendanceFace } from '@/common/api/attendance';
import { StudentData } from '@/common/interfaces/student';
import { fixLocalUrl } from '@/common/utils/url';

const RemoteCaptureContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromParams = searchParams.get('sessionId');
  const classId = searchParams.get('classId');
  const token = searchParams.get('token');
  
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromParams);
  const [isMounted, setIsMounted] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<StudentData[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    // Kiểm tra thiết bị di động
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    setIsMobile(mobileRegex.test(userAgent));

    if (token) {
      localStorage.setItem('accessToken', token);
      // Clean up URL to hide token
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }

    const verifySession = async () => {
      if (!sessionIdFromParams) {
        setIsValidSession(false);
        return;
      }
      try {
        const { default: http } = await import('@/common/utils/http');
        const { data } = await http.get(`/sessions/verify/${sessionIdFromParams}`);
        setIsValidSession(data.valid === true);
      } catch (err) {
        setIsValidSession(false);
      }
    };

    verifySession();
  }, [token, sessionIdFromParams]);

  if (!isMounted || isValidSession === null || isMobile === null) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0a0a0b' }}>
      <CircularProgress />
    </Box>
  );

  // Chặn nếu không phải điện thoại
  if (isMobile === false) {
    return (
      <Box sx={{ 
        height: '100vh', bgcolor: '#0a0a0b', color: '#fff', 
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', px: 4 
      }}>
        <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,0,0,0.2)', maxWidth: 400 }}>
          <Typography variant="h5" fontWeight="bold" color="error" gutterBottom>Thiết bị không hỗ trợ</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Tính năng chụp ảnh từ xa chỉ dành cho <strong>thiết bị di động</strong>. Vui lòng sử dụng điện thoại để quét mã QR trên màn hình giảng viên.
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              User Agent detected: {navigator.userAgent.substring(0, 50)}...
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Nếu phiên không hợp lệ, hiện trang 404 "tàng hình"
  if (isValidSession === false) {
    return (
      <Box sx={{ 
        height: '100vh', bgcolor: '#0a0a0b', color: '#fff', 
        display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', px: 4 
      }}>
        <Typography variant="h1" fontWeight="bold" sx={{ opacity: 0.1, fontSize: '8rem', mb: -2 }}>404</Typography>
        <Typography variant="h5" fontWeight="bold" gutterBottom>Trang không tồn tại</Typography>
        <Typography variant="body2" sx={{ opacity: 0.5 }}>
          Đường dẫn bạn truy cập không hợp lệ hoặc phiên điểm danh đã kết thúc.
        </Typography>
      </Box>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const newPreviews = fileArray.map(f => URL.createObjectURL(f));
    setSelectedFiles(prev => [...prev, ...fileArray]);
    setPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    setResults([]);
    setCapturedPhoto(null);

    try {
      let currentSessionId = sessionId;
      
      if (!currentSessionId && classId) {
        const { createSession } = await import('@/common/api/session');
        const session = await createSession({ class_id: classId });
        currentSessionId = session.id;
        setSessionId(currentSessionId);
      }

      if (!currentSessionId) {
        setError('Không tìm thấy phiên điểm danh hoặc mã lớp.');
        setUploading(false);
        return;
      }

      const fileNames = selectedFiles.map(f => f.name);
      const response = await recognizeAttendanceFace(currentSessionId, selectedFiles);
      
      if (response.success) {
        setResults(response.students || []);
        setSuccess(`Điểm danh ${response.students?.length || 0} sinh viên thành công!`);
        if ((response as any).photoUrl) setCapturedPhoto(fixLocalUrl((response as any).photoUrl as string) || null);
        // Xóa ảnh đã xử lý sau khi thành công
        setSelectedFiles([]);
        setPreviews([]);
      } else {
        setError(response.message || 'Không nhận diện được khuôn mặt nào.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý ảnh.');
    } finally {
      setUploading(false);
    }
  };

  if (!sessionId && !classId) {
    return (
      <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', bgcolor: '#0a0a0b' }}>
        <Alert severity="warning" variant="filled" sx={{ borderRadius: 4 }}>Thiếu thông tin lớp học hoặc phiên điểm danh.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0b', color: '#fff', pb: 8 }}>
      {/* Premium Header */}
      <Box sx={{ 
        py: 3, px: 2, textAlign: 'center', 
        background: 'linear-gradient(to bottom, rgba(168,85,247,0.15), transparent)',
        borderBottom: '1px solid rgba(168,85,247,0.1)'
      }}>
        <Typography variant="h6" fontFamily='"Cinzel", serif' sx={{
          background: 'linear-gradient(135deg, #c084fc, #fb7185)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
          fontWeight: 900, letterSpacing: 4, mb: 0.5
        }}>
          ✦ HOMURA ✦
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>
          AI Attendance System
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ 
          p: 4, borderRadius: 6, 
          bgcolor: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)', 
          textAlign: 'center', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
        }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>Chụp Ảnh Điểm Danh</Typography>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              Vui lòng chụp ảnh rõ mặt cả lớp để AI nhận diện tốt nhất.
            </Typography>
          </Box>

          <Button
            variant="contained"
            component="label"
            fullWidth
            size="large"
            disabled={uploading}
            startIcon={<CloudUploadIcon />}
            sx={{ 
              py: 2.5, 
              borderRadius: 4, 
              bgcolor: '#6366f1', 
              backgroundImage: 'linear-gradient(135deg, #6366f1, #a855f7)',
              '&:hover': { bgcolor: '#4f46e5', boxShadow: '0 0 20px rgba(99,102,241,0.4)' },
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textTransform: 'none'
            }}
          >
            Chọn Ảnh ({selectedFiles.length > 0 ? `${selectedFiles.length} ảnh đã chọn` : 'Có thể chọn nhiều'})
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={handleFileChange}
            />
          </Button>

          {/* Preview ảnh đã chọn */}
          {previews.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
                {previews.map((src, i) => (
                  <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '1', border: '1px solid rgba(168,85,247,0.3)' }}>
                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton
                      size="small"
                      onClick={() => {
                        URL.revokeObjectURL(src);
                        setPreviews(p => p.filter((_, idx) => idx !== i));
                        setSelectedFiles(f => f.filter((_, idx) => idx !== i));
                      }}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', p: 0.3 }}
                    >
                      ✕
                    </IconButton>
                  </Box>
                ))}
              </Box>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleSubmit}
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : undefined}
                sx={{
                  py: 2, borderRadius: 4,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  fontWeight: 'bold', textTransform: 'none', fontSize: '1rem'
                }}
              >
                {uploading ? 'Đang nhận diện...' : `Điểm danh ${selectedFiles.length} ảnh`}
              </Button>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 3, bgcolor: 'rgba(244,67,54,0.1)', color: '#ff8a80', border: '1px solid rgba(244,67,54,0.3)' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 3, borderRadius: 3, bgcolor: 'rgba(76,175,80,0.1)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>{success}</Alert>}
        </Paper>

        {/* AI Result Image */}
        {capturedPhoto && (
          <Box sx={{ mt: 4, borderRadius: 6, overflow: 'hidden', border: '2px solid rgba(168,85,247,0.3)', boxShadow: '0 0 30px rgba(168,85,247,0.2)' }}>
            <img 
              src={fixLocalUrl(capturedPhoto || '')} 
              alt="AI Detection Result" 
              style={{ width: '100%', display: 'block' }}
            />
            <Box sx={{ p: 1.5, bgcolor: 'rgba(168,85,247,0.1)', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#c084fc', fontWeight: 'bold' }}>
                ✦ AI ĐÃ QUÉT XONG ✦
              </Typography>
            </Box>
          </Box>
        )}

        {results.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#81c784' }}>
              <CheckCircleIcon /> Danh sách có mặt ({results.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {results.map((student) => (
                <Paper key={student.id} sx={{ 
                  bgcolor: 'rgba(255,255,255,0.04)', 
                  borderRadius: 3, 
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                  '&:active': { transform: 'scale(0.98)' }
                }}>
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar 
                        src={fixLocalUrl(student.photo_url) || undefined}
                        sx={{ width: 48, height: 48, border: '2px solid #a855f7' }}
                      >
                        {student.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={student.name} 
                      secondary={student.student_code}
                      primaryTypographyProps={{ fontWeight: 'bold', fontSize: '1rem' }}
                      secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    />
                    <CheckCircleIcon sx={{ color: '#4caf50', opacity: 0.8 }} />
                  </ListItem>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default function RemoteCapturePage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0a0a0b' }}><CircularProgress /></Box>}>
      <RemoteCaptureContent />
    </Suspense>
  );
}
