'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Box, Typography, Button, Container, Paper, Avatar, List, ListItem, 
  ListItemAvatar, ListItemText, CircularProgress, Alert, IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StudentData } from '@/common/interfaces/student';
import { fixLocalUrl } from '@/common/utils/url';
import axios from 'axios';

// Tạo axios instance độc lập, không có interceptor auth
// Điện thoại không cần token - chỉ cần sessionId hợp lệ
const getPublicBaseURL = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_SERVER_URL;
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && /^[0-9.]+$/.test(hostname)) {
    return `${window.location.protocol}//${hostname}:4000`;
  }
  return process.env.NEXT_PUBLIC_SERVER_URL;
};

const publicHttp = axios.create({
  baseURL: typeof window !== 'undefined' ? getPublicBaseURL() : process.env.NEXT_PUBLIC_SERVER_URL,
  timeout: 300000,
});

// Unwrap response envelope { statusCode, data } nếu có
publicHttp.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'statusCode' in response.data && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

const RemoteCaptureContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromParams = searchParams.get('sessionId');
  const classId = searchParams.get('classId');
  
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromParams);
  const [isMounted, setIsMounted] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [invalidReason, setInvalidReason] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<StudentData[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoFps, setVideoFps] = useState<number>(1);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    // Kiểm tra thiết bị di động
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    setIsMobile(mobileRegex.test(userAgent));

    const verifySession = async () => {
      if (!sessionIdFromParams) {
        setIsValidSession(false);
        return;
      }
      try {
        // Dùng publicHttp (không có interceptor auth) để không bị redirect login
        const baseURL = getPublicBaseURL();
        const { data } = await publicHttp.get(`/sessions/verify/${sessionIdFromParams}`, { baseURL });
        setIsValidSession(data.valid === true);
        if (!data.valid) setInvalidReason(data.reason || 'unknown');
      } catch (err) {
        setIsValidSession(false);
        setInvalidReason('error');
      }
    };

    verifySession();
  }, [sessionIdFromParams]);

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

  // Phiên không hợp lệ
  if (isValidSession === false) {
    const isExpired = invalidReason === 'expired';
    const isEnded = invalidReason === 'ended';
    return (
      <Box sx={{ 
        height: '100vh', bgcolor: '#0a0a0b', color: '#fff', 
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', px: 4 
      }}>
        <Typography variant="h1" fontWeight="bold" sx={{ opacity: 0.1, fontSize: '8rem', mb: -2 }}>
          {isExpired ? '⏰' : isEnded ? '🚫' : '404'}
        </Typography>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {isExpired ? 'Mã QR đã hết hạn' : isEnded ? 'Phiên điểm danh đã kết thúc' : 'Trang không tồn tại'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.5, maxWidth: 300 }}>
          {isExpired 
            ? 'Mã QR này thuộc phiên hôm qua. Giáo viên cần bấm lại "Điểm danh qua Phone" để tạo QR mới cho hôm nay.' 
            : isEnded 
            ? 'Giờ điểm danh đã kết thúc. Vui lòng liên hệ giáo viên nếu bạn cần điểm danh thủ công.'
            : 'Đường dẫn không hợp lệ hoặc phiên điểm danh đã kết thúc.'}
        </Typography>
      </Box>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setSelectedVideo(null); // Clear video if images selected
    const fileArray = Array.from(files);
    const newPreviews = fileArray.map(f => URL.createObjectURL(f));
    setSelectedFiles(prev => [...prev, ...fileArray]);
    setPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFiles([]); // Clear images if video selected
    setPreviews([]);
    setSelectedVideo(file);
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
      if (!sessionId) {
        setError('Không tìm thấy phiên điểm danh. Vui lòng quét lại mã QR.');
        setUploading(false);
        return;
      }

      // Gửi file bằng publicHttp (không cần token)
      const baseURL = getPublicBaseURL();
      const formData = new FormData();
      formData.append('session_id', sessionId);
      
      let endpoint = '/attendances/recognize';
      
      if (selectedVideo) {
        formData.append('file', selectedVideo);
        formData.append('fps', videoFps.toString());
        endpoint = '/attendances/video';
      } else {
        selectedFiles.forEach(file => formData.append('files', file));
      }

      const { data: response } = await publicHttp.post(endpoint, formData, {
        baseURL,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.success) {
        setResults(response.students || []);
        setSuccess(`✓ Điểm danh thành công ${response.students?.length || 0} sinh viên!`);
        if (response.photoUrl) setCapturedPhoto(fixLocalUrl(response.photoUrl as string) || null);
        setSelectedFiles([]);
        setPreviews([]);
      } else {
        setError(response.message || 'Không nhận diện được khuôn mặt nào.');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi xử lý ảnh.';
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  if (!sessionId && !classId) {
    return (
      <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', bgcolor: '#12091a' }}>
        <Alert severity="warning" variant="filled" sx={{ borderRadius: 4 }}>Thiếu thông tin lớp học hoặc phiên điểm danh.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#12091a', color: '#fff', pb: 8 }}>
      {/* Premium Header */}
      <Box sx={{ 
        py: 3, px: 2, textAlign: 'center', 
        background: 'linear-gradient(to bottom, rgba(168,85,247,0.15), transparent)',
        borderBottom: '1px solid rgba(168,85,247,0.1)'
      }}>
        <Typography variant="h6" fontFamily='"Cinzel", serif' sx={{
          background: 'linear-gradient(135deg, #a855f7, #fb7185)',
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
              bgcolor: '#a855f7', 
              backgroundImage: 'linear-gradient(135deg, #a855f7, #e11d48)',
              '&:hover': { bg: 'linear-gradient(135deg, #c084fc, #fb7185)', boxShadow: '0 0 20px rgba(168,85,247,0.4)' },
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
              aria-label="Chọn ảnh để điểm danh"
              onChange={handleFileChange}
            />
          </Button>

          <Button
            variant="outlined"
            component="label"
            fullWidth
            size="large"
            disabled={uploading}
            startIcon={<CloudUploadIcon />}
            sx={{ 
              mt: 2,
              py: 2.5, 
              borderRadius: 4, 
              borderColor: 'rgba(168,85,247,0.5)',
              color: '#c084fc',
              '&:hover': { borderColor: '#c084fc', bgcolor: 'rgba(168,85,247,0.1)' },
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textTransform: 'none'
            }}
          >
            {selectedVideo ? `Video đã chọn: ${selectedVideo.name}` : 'Chọn Video (Tối đa 200MB)'}
            <input
              type="file"
              hidden
              accept="video/mp4,video/quicktime,video/webm"
              aria-label="Chọn video để điểm danh"
              onChange={handleVideoChange}
            />
          </Button>

          {selectedVideo && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Tốc độ quét: {videoFps} fps
              </Typography>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.5" 
                value={videoFps}
                onChange={(e) => setVideoFps(parseFloat(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
                title="Khung hình/giây"
              />
            </Box>
          )}

          {/* Preview ảnh đã chọn */}
          {previews.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
                {previews.map((src, i) => (
                  <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '1', border: '1px solid rgba(168,85,247,0.3)' }}>
                    <img src={src} alt="Xem trước ảnh chụp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            </Box>
          )}

              {(selectedFiles.length > 0 || selectedVideo) && (
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  color="success"
                  onClick={handleSubmit}
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={24} color="inherit" /> : <CloudUploadIcon />}
                  sx={{ 
                    mt: 3, py: 2, borderRadius: 3, fontSize: '1.1rem', fontWeight: 'bold',
                    boxShadow: '0 8px 16px rgba(34,197,94,0.3)', textTransform: 'none'
                  }}
                >
                  {uploading ? 'Đang xử lý...' : 'Bắt đầu nhận diện AI'}
                </Button>
              )}
          {error && (
            <Alert severity="error" sx={{ mt: 3, borderRadius: 3, bgcolor: 'rgba(244,67,54,0.1)', color: '#ff8a80', border: '1px solid rgba(244,67,54,0.3)', textAlign: 'left' }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.9rem' }}>
                {error}
              </Typography>
            </Alert>
          )}
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
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#12091a' }}><CircularProgress /></Box>}>
      <RemoteCaptureContent />
    </Suspense>
  );
}
