import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Chip, Button,
  TextField, Dialog, DialogTitle, DialogContent, IconButton, DialogActions
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import * as XLSX from 'xlsx';
import { getCourses } from '@/common/api/course';
import { getClasses } from '@/common/api/class';
import { getSessions } from '@/common/api/session';
import { markAttendanceManual } from '@/common/api/attendance';
import ConfirmDialog from '@/components/ConfirmDialog';

const StatsPanel = () => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detailsDialog, setDetailsDialog] = useState<any>(null);
  const [searchAttTerm, setSearchAttTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  
  const queryClient = useQueryClient();

  const { data: subjects = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: classes = [] } = useQuery({ queryKey: ['classes', selectedSubject], queryFn: () => getClasses(selectedSubject), enabled: !!selectedSubject });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions', selectedClass], queryFn: () => getSessions(selectedClass), enabled: !!selectedClass });

  const sessionsByDate = useMemo(() => {
    const groups: Record<string, any> = {};
    
    sessions.forEach((s: any) => {
      const dateKey = new Date(s.created_at).toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          id: dateKey,
          dateKey,
          displayDate: new Date(s.created_at).toLocaleDateString('vi-VN'),
          created_at: s.created_at,
          attendances: [],
        };
      }
      
      (s.attendances || []).forEach((att: any) => {
        const studentId = att.student?.id;
        if (!studentId) return;
        
        const existingAttIdx = groups[dateKey].attendances.findIndex((a: any) => a.student?.id === studentId);
        if (existingAttIdx === -1) {
          groups[dateKey].attendances.push({ ...att, sessionId: s.id });
        } else {
          const existingAtt = groups[dateKey].attendances[existingAttIdx];
          const statusOrder: Record<string, number> = { present: 3, late: 2, absent: 1 };
          if (statusOrder[att.status] > statusOrder[existingAtt.status]) {
            groups[dateKey].attendances[existingAttIdx] = { ...att, sessionId: s.id };
          }
        }
      });
    });

    return Object.values(groups).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessionsByDate.filter((s: any) => {
      if (fromDate && new Date(s.created_at) < new Date(fromDate)) return false;
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (new Date(s.created_at) > tDate) return false;
      }
      return true;
    });
  }, [sessionsByDate, fromDate, toDate]);

  const stats = useMemo(() => {
    let total = 0, present = 0, absent = 0, late = 0;
    filteredSessions.forEach((s: any) => {
      s.attendances?.forEach((r: any) => {
        total++;
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'late') late++;
      });
    });
    return { total, present, absent, late };
  }, [filteredSessions]);

  const markManualMut = useMutation({
    mutationFn: markAttendanceManual,
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['sessions', selectedClass] });
    }
  });

  const exportToExcel = () => {
    if (filteredSessions.length === 0) return;

    const subjectName = subjects.find((s: any) => s.id === selectedSubject)?.name || '';
    const className = classes.find((c: any) => c.id === selectedClass)?.name || '';

    const rows: any[] = [];
    filteredSessions.forEach((s: any) => {
      (s.attendances || []).forEach((r: any) => {
        const statusMap: Record<string, string> = { present: 'Có mặt', absent: 'Vắng', late: 'Muộn' };
        rows.push({
          'Ngày': new Date(s.created_at).toLocaleDateString('vi-VN'),
          'Mã SV': r.student?.student_code || '',
          'Họ tên': r.student?.name || '',
          'Trạng thái': statusMap[r.status] || r.status,
          'Thời gian nhận diện': r.recognized_at ? new Date(r.recognized_at).toLocaleString('vi-VN') : '',
        });
      });
    });

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Điểm danh');

    const summaryRows = [
      { 'Thông tin': 'Môn học', 'Giá trị': subjectName },
      { 'Thông tin': 'Lớp', 'Giá trị': className },
      { 'Thông tin': 'Tổng số ngày', 'Giá trị': filteredSessions.length },
      { 'Thông tin': 'Tổng lượt', 'Giá trị': stats.total },
      { 'Thông tin': 'Có mặt', 'Giá trị': stats.present },
      { 'Thông tin': 'Vắng', 'Giá trị': stats.absent },
      { 'Thông tin': 'Muộn', 'Giá trị': stats.late },
      { 'Thông tin': 'Tỉ lệ có mặt', 'Giá trị': stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : '0%' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp');

    XLSX.writeFile(wb, `Diem_danh_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const statCards = [
    { label: 'Tổng lượt', value: stats.total, gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', icon: <PeopleIcon /> },
    { label: 'Có mặt', value: stats.present, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', icon: <CheckCircleIcon /> },
    { label: 'Vắng', value: stats.absent, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: <CancelIcon /> },
    { label: 'Muộn', value: stats.late, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: <AccessTimeIcon /> },
  ];

  return (
    <Box>
      <Typography variant="h4" fontFamily='"Cinzel", serif' sx={{ mb: 3 }}>Thống Kê Điểm Danh</Typography>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Môn học</InputLabel>
            <Select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedClass(''); }} label="Môn học">
              {subjects.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Lớp</InputLabel>
            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} label="Lớp" disabled={!selectedSubject}>
              {classes.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name} ({c.type === 'theory' ? 'LT' : 'TH'})</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Từ ngày"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={!selectedClass}
            size="small"
            sx={{ 
              '& input::-webkit-calendar-picker-indicator': {
                filter: 'invert(1)',
                cursor: 'pointer',
              }
            }}
          />
          <TextField
            label="Đến ngày"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            disabled={!selectedClass}
            size="small"
            sx={{ 
              '& input::-webkit-calendar-picker-indicator': {
                filter: 'invert(1)',
                cursor: 'pointer',
              }
            }}
          />
          {filteredSessions.length > 0 && (
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToExcel} sx={{ ml: 'auto' }}>
              Xuất Excel
            </Button>
          )}
        </Box>
      </Paper>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
        {statCards.map((card) => (
          <Paper key={card.label} sx={{ p: 2.5, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: card.gradient }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 1 }}>
              <Box sx={{ color: 'primary.light', opacity: 0.7 }}>{card.icon}</Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" fontFamily='"Cinzel", serif' fontWeight={700}>{card.value}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Sessions */}
      {filteredSessions.length > 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ngày</TableCell>
                <TableCell align="center">Có mặt</TableCell>
                <TableCell align="center">Vắng</TableCell>
                <TableCell align="center">Muộn</TableCell>
                <TableCell align="center">Tổng</TableCell>
                <TableCell align="center">Chi Tiết</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSessions.map((s: any) => {
                const records = s.attendances || [];
                const p = records.filter((r: any) => r.status === 'present').length;
                const a = records.filter((r: any) => r.status === 'absent').length;
                const l = records.filter((r: any) => r.status === 'late').length;
                return (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.displayDate}</TableCell>
                    <TableCell align="center"><Chip label={p} color="success" size="small" /></TableCell>
                    <TableCell align="center"><Chip label={a} color="error" size="small" /></TableCell>
                    <TableCell align="center"><Chip label={l} color="warning" size="small" /></TableCell>
                    <TableCell align="center">{records.length}</TableCell>
                    <TableCell align="center">
                       <Button size="small" variant="outlined" onClick={() => setDetailsDialog(s)}>Xem</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {selectedClass && filteredSessions.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">Chưa có buổi điểm danh nào phù hợp</Typography>
        </Paper>
      )}

      {/* Session Details Dialog */}
      <Dialog open={!!detailsDialog} onClose={() => { setDetailsDialog(null); setSearchAttTerm(''); }} maxWidth="md" fullWidth>
        <DialogTitle fontFamily='"Cinzel", serif'>
           Chi Tiết Điểm Danh - {detailsDialog ? detailsDialog.displayDate : ''}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
           <TextField 
             size="small" 
             placeholder="Tìm MSSV hoặc tên học sinh..." 
             autoFocus
             value={searchAttTerm}
             onChange={(e) => setSearchAttTerm(e.target.value)}
             sx={{ mt: 1 }}
           />
           <TableContainer component={Paper} variant="outlined">
             <Table size="small">
               <TableHead>
                 <TableRow>
                   <TableCell>Họ tên</TableCell>
                   <TableCell>MSSV</TableCell>
                   <TableCell align="center">Trạng thái</TableCell>
                   <TableCell align="center">Xóa/Gỡ</TableCell>
                 </TableRow>
               </TableHead>
               <TableBody>
                 {(detailsDialog?.attendances || [])
                   .filter((r: any) => r.student?.name.toLowerCase().includes(searchAttTerm.toLowerCase()) || r.student?.student_code.toLowerCase().includes(searchAttTerm.toLowerCase()))
                   .map((r: any) => (
                     <TableRow key={r.id}>
                       <TableCell>{r.student?.name}</TableCell>
                       <TableCell>{r.student?.student_code}</TableCell>
                       <TableCell align="center">
                         <Select
                           value={r.status}
                           size="small"
                           onChange={(e) => {
                             const newStatus = e.target.value;
                             markManualMut.mutate({ session_id: r.sessionId, student_id: r.student.id, status: newStatus });
                             setDetailsDialog({ 
                               ...detailsDialog, 
                               attendances: detailsDialog.attendances.map((x: any) => x.id === r.id ? { ...x, status: newStatus } : x) 
                             });
                           }}
                           sx={{ 
                             height: 32, 
                             fontSize: '0.8125rem',
                             '& .MuiSelect-select': { py: 0.5, display: 'flex', alignItems: 'center' },
                             minWidth: 120,
                             bgcolor: r.status === 'present' ? 'rgba(34,197,94,0.1)' : r.status === 'late' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                             color: r.status === 'present' ? '#16a34a' : r.status === 'late' ? '#d97706' : '#dc2626',
                             fontWeight: 600,
                             borderRadius: 2,
                             '& fieldset': { border: 'none' }
                           }}
                         >
                           <MenuItem value="present">Có mặt</MenuItem>
                           <MenuItem value="late">Vào muộn</MenuItem>
                           <MenuItem value="absent">Vắng mặt</MenuItem>
                         </Select>
                       </TableCell>
                       <TableCell align="center">
                         {r.status !== 'absent' && (
                           <IconButton color="error" size="small" onClick={() => {
                              setConfirmDialog({
                                title: 'Gỡ điểm danh',
                                message: `Bạn có chắc chắn muốn gỡ điểm danh của học sinh ${r.student?.name}?\nHành động này sẽ xóa hoàn toàn ảnh minh chứng khỏi hệ thống lưu trữ (MinIO) và không thể hoàn tác!`,
                                 onConfirm: () => {
                                    markManualMut.mutate({ session_id: r.sessionId, student_id: r.student.id, status: 'absent' });
                                    setDetailsDialog({ ...detailsDialog, attendances: detailsDialog.attendances.map((x: any) => x.id === r.id ? { ...x, status: 'absent' } : x) });
                                    setConfirmDialog(null);
                                 }
                              });
                           }} disabled={markManualMut.isPending}>
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                         )}
                       </TableCell>
                     </TableRow>
                   ))}
               </TableBody>
             </Table>
           </TableContainer>
        </DialogContent>
        <DialogActions>
           <Button onClick={() => setDetailsDialog(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
      
      {confirmDialog && (
        <ConfirmDialog
          open={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          isPending={markManualMut.isPending}
        />
      )}
    </Box>
  );
};

export default StatsPanel;
