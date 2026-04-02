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

const RemoteCaptureContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromParams = searchParams.get('sessionId');
  const classId = searchParams.get('classId');
  const token = searchParams.get('token');
  
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromParams);

  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<StudentData[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      localStorage.setItem('accessToken', token);
    }
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setResults([]);

    try {
      let currentSessionId = sessionId;
      
      // Nếu chưa có sessionId, tự động tạo phiên mới bằng classId
      if (!currentSessionId && classId) {
        setUploading(true);
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

      const fileArray = Array.from(files);
      const fileNames = fileArray.map(f => f.name);
      
      const response = await recognizeAttendanceFace(currentSessionId, fileArray, fileNames);
      
      if (response.success) {
        setResults(response.students || []);
        setSuccess(response.message);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý ảnh.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  if (!sessionId && !classId) {
    return (
      <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <Alert severity="warning">Thiếu thông tin lớp học hoặc phiên điểm danh.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0b', color: '#fff', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom fontFamily='"Cinzel", serif'>Điểm Danh</Typography>
            <Typography variant="body1" sx={{ opacity: 0.7 }}>
              Chụp ảnh lớp học để điểm danh tự động.
            </Typography>
          </Box>

          <Button
            variant="contained"
            component="label"
            fullWidth
            size="large"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={24} color="inherit" /> : <CloudUploadIcon />}
            sx={{ 
              py: 2, 
              borderRadius: 3, 
              bgcolor: '#6366f1', 
              '&:hover': { bgcolor: '#4f46e5' },
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)'
            }}
          >
            {uploading ? 'Đang xử lý...' : 'Chọn/Chụp Ảnh'}
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
            />
          </Button>

          {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 3, borderRadius: 2 }}>{success}</Alert>}
        </Paper>

        {results.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" /> Đã nhận diện ({results.length}):
            </Typography>
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {results.map((student) => (
                <Paper key={student.id} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar src={student.photo_url || undefined}>
                        {student.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={student.name} 
                      secondary={student.student_code}
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                      secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' } }}
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
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
