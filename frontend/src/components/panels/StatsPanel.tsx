import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Button,
  TextField, Dialog, DialogTitle, DialogContent, IconButton, DialogActions,
  LinearProgress, Badge, Avatar
} from '@mui/material';
import { PremiumScrollContainer } from '../common/PremiumScrollContainer';
import { SectionHeader } from '../common/SectionHeader';
import { EmptyState } from '../common/EmptyState';
import { useConfirm } from '@/hooks/useConfirm';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import * as XLSX from 'xlsx';
import { getCourses } from '@/common/api/course';
import { getClasses } from '@/common/api/class';
import { getSessions, deleteSession } from '@/common/api/session';
import { markAttendanceManual, removeAttendance } from '@/common/api/attendance';
import { fixLocalUrl } from '@/common/utils/url';

const parseSafeDate = (val: any) => {
  if (!val) return new Date(NaN);
  if (val instanceof Date) return val;
  let d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  if (typeof val === 'string' && val.trim()) {
    let fixed = val.trim().replace(' ', 'T');
    if (fixed.includes('.')) {
      const parts = fixed.split('.');
      fixed = parts[0] + '.' + parts[1].substring(0, 3);
    }
    d = new Date(fixed);
    if (!isNaN(d.getTime())) return d;
    const dateMatch = val.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      d = new Date(dateMatch[0]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date(NaN);
};

const StatsPanel = () => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const savedSubject = sessionStorage.getItem("stats_selectedSubject");
    const savedClass = sessionStorage.getItem("stats_selectedClass");
    if (savedSubject) setSelectedSubject(savedSubject);
    if (savedClass) setSelectedClass(savedClass);
  }, []);

  useEffect(() => {
    if (selectedSubject) sessionStorage.setItem("stats_selectedSubject", selectedSubject);
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedClass) sessionStorage.setItem("stats_selectedClass", selectedClass);
  }, [selectedClass]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detailsDialog, setDetailsDialog] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [searchAttTerm, setSearchAttTerm] = useState('');
  
  const queryClient = useQueryClient();
  const openConfirm = useConfirm();

  const { data: subjects = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: classes = [] } = useQuery({ queryKey: ['classes', selectedSubject], queryFn: () => getClasses(selectedSubject), enabled: !!selectedSubject });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions', selectedClass], queryFn: () => getSessions(selectedClass), enabled: !!selectedClass });

  // Kiểm tra nếu dữ liệu từ sessionStorage trỏ tới môn học/lớp học đã bị xóa
  useEffect(() => {
    if (subjects.length > 0 && selectedSubject) {
      if (!subjects.some((s: any) => s.id === selectedSubject)) {
        setSelectedSubject("");
        setSelectedClass("");
        sessionStorage.removeItem("stats_selectedSubject");
        sessionStorage.removeItem("stats_selectedClass");
      }
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (classes.length > 0 && selectedClass) {
      if (!classes.some((c: any) => c.id === selectedClass)) {
        setSelectedClass("");
        sessionStorage.removeItem("stats_selectedClass");
      }
    }
  }, [classes, selectedClass]);

  const sessionsByDate = useMemo(() => {
    const groups: Record<string, any> = {};
    const rawSessions = Array.isArray(sessions) ? sessions : (sessions as any)?.data || [];
    
    rawSessions.forEach((s: any) => {
      // created_at là ISO string UTC, ví dụ "2026-04-24T21:20:42.772Z"
      const rawDate = s.created_at || s.createdAt;
      const d = new Date(rawDate);
      const isValid = rawDate && !isNaN(d.getTime());

      // Key nhóm theo ngày VN
      const dateKey = isValid
        ? d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }) // "2026-04-25"
        : 'unknown';

      if (!groups[dateKey]) {
        groups[dateKey] = {
          id: dateKey,
          dateKey,
          displayDate: isValid
            ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
            : 'Không xác định',
          created_at: rawDate,
          sessionId: s.id,
          attendances: [],
        };
      }

      (s.attendances || []).forEach((att: any) => {
        const studentId = att.student?.id;
        if (!studentId) return;
        const existingIdx = groups[dateKey].attendances.findIndex((a: any) => a.student?.id === studentId);
        if (existingIdx === -1) {
          groups[dateKey].attendances.push({ ...att, sessionId: s.id });
        } else {
          const statusOrder: Record<string, number> = { present: 3, late: 2, absent: 1 };
          const existing = groups[dateKey].attendances[existingIdx];
          if ((statusOrder[att.status] || 0) > (statusOrder[existing.status] || 0)) {
            groups[dateKey].attendances[existingIdx] = { ...att, sessionId: s.id };
          }
        }
      });
    });

    return Object.values(groups).sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessionsByDate.filter((s: any) => {
      const sessionDate = parseSafeDate(s.created_at);
      const sessionTime = sessionDate.getTime();
      if (fromDate) {
        const fDate = parseSafeDate(fromDate);
        if (!isNaN(fDate.getTime()) && sessionTime < fDate.getTime()) return false;
      }
      if (toDate) {
        const tDate = parseSafeDate(toDate);
        if (!isNaN(tDate.getTime())) {
          tDate.setHours(23, 59, 59, 999);
          if (sessionTime > tDate.getTime()) return false;
        }
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', selectedClass] })
  });

  const deleteSessionMut = useMutation({
    mutationFn: ({ id, archive }: { id: string, archive: boolean }) => deleteSession(id, archive),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['sessions', selectedClass] });
       setDetailsDialog(null);
    }
  });

  const removeAttendanceMut = useMutation({
    mutationFn: (payload: { session_id: string, student_id: string, archive?: boolean }) => removeAttendance(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', selectedClass] })
  });

  const exportToExcel = () => {
    if (filteredSessions.length === 0) return;
    const subjectName = subjects.find((s: any) => s.id === selectedSubject)?.name || '';
    const className = classes.find((c: any) => c.id === selectedClass)?.name || '';
    
    const studentMap = new Map<string, { code: string, name: string, records: Record<string, string> }>();
    const sessionColumns: { key: string, label: string }[] = [];

    // Sắp xếp các buổi học theo thời gian tăng dần dựa trên created_at
    const sortedSessions = [...filteredSessions].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    sortedSessions.forEach((s: any, idx: number) => {
      // Sử dụng created_at làm nguồn tin cậy duy nhất cho ngày tháng
      const sessionDate = new Date(s.created_at);
      
      // Định dạng ngày theo giờ Việt Nam
      const dateStr = sessionDate.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
      const colLabel = `Buổi ${idx + 1} (${dateStr})`;
      sessionColumns.push({ key: colLabel, label: colLabel });

      (s.attendances || []).forEach((r: any) => {
        if (!r.student) return;
        if (!studentMap.has(r.student.id)) {
          studentMap.set(r.student.id, { 
            code: r.student.student_code, 
            name: r.student.name, 
            records: {} 
          });
        }
        
        let statusText = 'V';
        if (r.status === 'present' || r.status === 'late') {
          const char = r.status === 'present' ? 'P' : 'L';
          let timeStr = '';
          if (r.recognized_at) {
            const recDate = new Date(r.recognized_at);
            if (!isNaN(recDate.getTime())) {
              timeStr = ` (${recDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })})`;
            }
          }
          statusText = `${char}${timeStr}`;
        }
        
        studentMap.get(r.student.id)!.records[colLabel] = statusText;
      });
    });

    const rows: any[] = [];
    rows.push({ 'Mã SV': `MÔN HỌC: ${subjectName.toUpperCase()}`, 'Họ tên': `LỚP: ${className.toUpperCase()}` });
    rows.push({ 'Mã SV': `NGÀY XUẤT: ${new Date().toLocaleString('vi-VN')}`, 'Họ tên': `TỔNG SỐ BUỔI ĐÃ HỌC: ${sessionColumns.length}` });
    rows.push({});

    const sortedStudents = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    sortedStudents.forEach((student) => {
      const row: any = {
        'Mã SV': student.code,
        'Họ tên': student.name,
      };

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      sessionColumns.forEach(col => {
        const status = student.records[col.key] || 'V';
        row[col.label] = status;
        if (status.startsWith('P')) presentCount++;
        else if (status.startsWith('L')) lateCount++;
        else absentCount++;
      });

      row['Có mặt (P)'] = presentCount;
      row['Muộn (L)'] = lateCount;
      row['Vắng (V)'] = absentCount;
      row['Tỉ lệ %'] = `${Math.round(((presentCount + lateCount) / sessionColumns.length) * 100)}%`;

      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 },
      ...sessionColumns.map(() => ({ wch: 12 })),
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu điểm danh');
    XLSX.writeFile(wb, `Diem_Danh_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const statCards = [
    { label: 'Tổng lượt', value: stats.total, gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', icon: <PeopleIcon /> },
    { label: 'Có mặt', value: stats.present, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', icon: <CheckCircleIcon /> },
    { label: 'Vắng', value: stats.absent, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: <CancelIcon /> },
    { label: 'Muộn', value: stats.late, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: <AccessTimeIcon /> },
  ];

  return (
    <Box>
      <SectionHeader 
        title="Lịch Sử Chi Tiết" 
        actions={
          filteredSessions.length > 0 ? (
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToExcel}>
              Xuất Excel
            </Button>
          ) : undefined
        }
      />

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
          <TextField label="Từ ngày" type="date" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={!selectedClass} size="small" sx={{ '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' } }} />
          <TextField label="Đến ngày" type="date" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={!selectedClass} size="small" sx={{ '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' } }} />
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
        {statCards.map((card) => (
          <Paper key={card.label} sx={{ p: 2.5, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: card.gradient }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 1 }}>
              <Box sx={{ color: 'primary.light', opacity: 0.7 }}>{card.icon}</Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</Typography>
                <Typography variant="h4" fontFamily='"Cinzel", serif' fontWeight={700}>{card.value}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {filteredSessions.length > 0 ? (
        <PremiumScrollContainer maxHeight="calc(100vh - 400px)">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ngày</TableCell>
                <TableCell align="center">Có mặt</TableCell>
                <TableCell align="center">Vắng</TableCell>
                <TableCell align="center">Muộn</TableCell>
                <TableCell align="center">Tổng</TableCell>
                <TableCell align="center">Tiến độ</TableCell>
                <TableCell align="center">Chi Tiết</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSessions.map((s: any) => {
                const records = s.attendances || [];
                const p = records.filter((r: any) => r.status === 'present').length;
                const a = records.filter((r: any) => r.status === 'absent').length;
                const l = records.filter((r: any) => r.status === 'late').length;
                const total = records.length;
                const progress = total > 0 ? ((p + l) / total) * 100 : 0;
                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{s.displayDate}</TableCell>
                    <TableCell align="center"><Chip label={p} color="success" size="small" variant="outlined" sx={{ fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="center"><Chip label={a} color="error" size="small" variant="outlined" sx={{ fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="center"><Chip label={l} color="warning" size="small" variant="outlined" sx={{ fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{total}</TableCell>
                    <TableCell align="center" sx={{ minWidth: 120 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
                         <Typography variant="caption" sx={{ minWidth: 25 }}>{Math.round(progress)}%</Typography>
                       </Box>
                    </TableCell>
                    <TableCell align="center">
                       <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button size="small" variant="outlined" onClick={() => setDetailsDialog(s)}>Xem</Button>
                          <IconButton size="small" color="error" onClick={() => openConfirm({
                            title: 'Xóa buổi học',
                            message: `Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của buổi học ngày ${s.displayDate}?\n(Dữ liệu điểm danh của tất cả học sinh trong buổi này sẽ bị mất)`,
                            showArchiveOption: true,
                            onConfirm: (archive: any) => deleteSessionMut.mutate({ id: s.id, archive: !!archive }),
                            isPending: deleteSessionMut.isPending
                          })}><DeleteIcon fontSize="small" /></IconButton>
                       </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </PremiumScrollContainer>
      ) : selectedClass ? (
        <EmptyState 
          message="Chưa có buổi điểm danh nào phù hợp với bộ lọc."
        />
      ) : (
        <EmptyState 
          message="Vui lòng chọn môn học và lớp để xem thống kê."
        />
      )}

      <Dialog open={!!detailsDialog} onClose={() => { setDetailsDialog(null); setSearchAttTerm(''); }} maxWidth="md" fullWidth>
        <DialogTitle fontFamily='"Cinzel", serif'>Chi Tiết Điểm Danh - {detailsDialog?.displayDate}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(() => {
             const allRecords = (detailsDialog?.attendances || []);
             const filtered = allRecords.filter((r: any) => r.student?.name.toLowerCase().includes(searchAttTerm.toLowerCase()) || r.student?.student_code.toLowerCase().includes(searchAttTerm.toLowerCase()));
             const p = allRecords.filter((r: any) => r.status === 'present').length;
             const l = allRecords.filter((r: any) => r.status === 'late').length;
             const a = allRecords.filter((r: any) => r.status === 'absent').length;
             const total = allRecords.length;
             const prog = total > 0 ? ((p + l) / total) * 100 : 0;

             return (
               <>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', mb: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                         <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1.1 }}>TIẾN ĐỘ BUỔI HỌC ({p+l}/{total})</Typography>
                         <Typography variant="subtitle2" color="primary" fontWeight="bold">{Math.round(prog)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={prog} sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { borderRadius: 5 } }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Badge badgeContent={p} color="success" showZero overlap="rectangular"><Chip label="Có mặt" size="small" color="success" variant="outlined" sx={{ fontWeight: 600, py: 1.8 }} /></Badge>
                      <Badge badgeContent={l} color="warning" showZero overlap="rectangular"><Chip label="Đi muộn" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, py: 1.8 }} /></Badge>
                      <Badge badgeContent={a} color="error" showZero overlap="rectangular"><Chip label="Vắng" size="small" color="error" variant="outlined" sx={{ fontWeight: 600, py: 1.8, opacity: 0.8 }} /></Badge>
                    </Box>
                  </Box>
                </Paper>
                <TextField size="small" placeholder="Tìm MSSV hoặc tên học sinh..." autoFocus value={searchAttTerm} onChange={(e) => setSearchAttTerm(e.target.value)} fullWidth />
                <PremiumScrollContainer maxHeight="55vh" variant="outlined">
                  <Table size="small" stickyHeader>
                    <TableHead><TableRow><TableCell>Họ tên</TableCell><TableCell>MSSV</TableCell><TableCell align="center">Trạng thái</TableCell><TableCell align="center">Thao tác</TableCell></TableRow></TableHead>
                    <TableBody>
                      {filtered.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" color={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'error'} sx={{ '& .MuiBadge-badge': { width: 10, height: 10, borderRadius: '50%', border: '2px solid #1e1e1e', bgcolor: r.status === 'absent' ? '#666' : undefined } }}>
                                <Avatar src={fixLocalUrl(r.student?.photo_url) || undefined} sx={{ width: 32, height: 32 }} imgProps={{ crossOrigin: 'anonymous' }}>{r.student?.name[0]}</Avatar>
                              </Badge>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {r.student?.name}
                                  {!r.captured_frame_url && (r.status === 'present' || r.status === 'late') && (
                                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main', fontWeight: 'bold' }}>(Thủ công)</Typography>
                                  )}
                                </Typography>
                                {(r.status === 'present' || r.status === 'late') && r.recognized_at && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    <AccessTimeIcon sx={{ fontSize: 12 }} /> 
                                    Lúc {new Date(r.recognized_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{r.student?.student_code}</TableCell>
                          <TableCell align="center">
                            <Select
                              value={r.status}
                              size="small"
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus === 'absent') {
                                   const oldLabel = r.status === 'present' ? 'Có mặt' : 'Vào muộn';
                                   openConfirm({
                                     title: 'Xác nhận Vắng mặt',
                                     message: `Bạn đang thực hiện chuyển trạng thái của sinh viên ${r.student?.name} từ [${oldLabel}] sang [Vắng mặt]. \n\nHành động này sẽ XÓA BỎ hoàn toàn ghi nhận thời gian điểm danh và ảnh minh chứng của sinh viên trong buổi học này. Bạn có chắc chắn muốn tiếp tục không?`,
                                     showArchiveOption: !!r.captured_frame_url,
                                     onConfirm: (archive: any) => {
                                       removeAttendanceMut.mutate({ session_id: r.sessionId, student_id: r.student.id, archive: !!archive });
                                       setDetailsDialog({ 
                                          ...detailsDialog, 
                                          attendances: detailsDialog.attendances.map((x: any) => x.id === r.id ? { ...x, status: 'absent', recognized_at: null, captured_frame_url: null } : x) 
                                       });
                                     },
                                     isPending: removeAttendanceMut.isPending
                                   });
                                } else {
                                  markManualMut.mutate({ session_id: r.sessionId, student_id: r.student.id, status: newStatus });
                                  setDetailsDialog({ 
                                    ...detailsDialog, 
                                    attendances: detailsDialog.attendances.map((x: any) => x.id === r.id ? { ...x, status: newStatus, recognized_at: x.recognized_at || new Date().toISOString() } : x) 
                                  });
                                }
                              }}
                              sx={{ 
                                height: 32, fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.5, display: 'flex', alignItems: 'center' }, minWidth: 120,
                                bgcolor: r.status === 'present' ? 'rgba(34,197,94,0.1)' : r.status === 'late' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                color: r.status === 'present' ? '#16a34a' : r.status === 'late' ? '#d97706' : '#dc2626',
                                fontWeight: 600, borderRadius: 2, '& fieldset': { border: 'none' }
                              }}
                            >
                              <MenuItem value="present">Có mặt</MenuItem>
                              <MenuItem value="late">Vào muộn</MenuItem>
                              <MenuItem value="absent">Vắng mặt</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell align="center">
                            {!!r.captured_frame_url && r.status !== 'absent' && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton 
                                  color="primary" 
                                  size="small" 
                                  onClick={() => setPreviewImage(r)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                                <IconButton color="error" size="small" onClick={() => openConfirm({
                                  title: 'Xóa dữ liệu ảnh',
                                  message: `Bạn có chắc chắn muốn xóa ảnh minh chứng điểm danh của học sinh ${r.student?.name}?`,
                                  showArchiveOption: true,
                                  onConfirm: (archive: any) => {
                                     removeAttendanceMut.mutate({ session_id: r.sessionId, student_id: r.student.id, archive: !!archive });
                                     setDetailsDialog({ 
                                        ...detailsDialog, 
                                        attendances: detailsDialog.attendances.map((x: any) => x.id === r.id ? { ...x, status: 'absent', captured_frame_url: null } : x) 
                                     });
                                  },
                                  isPending: removeAttendanceMut.isPending
                                })} disabled={removeAttendanceMut.isPending}><DeleteIcon fontSize="small" /></IconButton>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </PremiumScrollContainer>
               </>
             );
          })()}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailsDialog(null)}>Đóng</Button></DialogActions>
      </Dialog>

      {/* Preview Ảnh Minh Chứng với Bounding Box ảo */}
      <Dialog 
        open={!!previewImage} 
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: 'background.paper',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
           <Typography component="div" variant="h6" fontWeight="bold">Minh chứng điểm danh - {previewImage?.student?.name}</Typography>
           <IconButton onClick={() => setPreviewImage(null)} size="small"><HighlightOffIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 4, pt: 2 }}>
          {previewImage && (
            <Box sx={{ 
              position: 'relative', 
              display: 'inline-block', 
              borderRadius: 4, 
              overflow: 'hidden', 
              border: '2px solid rgba(168, 85, 247, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              bgcolor: '#000'
            }}>
              <img 
                src={fixLocalUrl(previewImage.captured_frame_url)} 
                alt="Attendance Proof" 
                crossOrigin="anonymous"
                style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block' }} 
              />
              {/* Vẽ Bounding Box từ Metadata */}
              {previewImage.training_metadata?.bbox && (
                <svg
                  viewBox={`0 0 ${previewImage.training_metadata.imgWidth || 1} ${previewImage.training_metadata.imgHeight || 1}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  <rect
                    x={previewImage.training_metadata.bbox[0]}
                    y={previewImage.training_metadata.bbox[1]}
                    width={previewImage.training_metadata.bbox[2] - previewImage.training_metadata.bbox[0]}
                    height={previewImage.training_metadata.bbox[3] - previewImage.training_metadata.bbox[1]}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="4"
                  />
                </svg>
              )}
            </Box>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.6, fontStyle: 'italic' }}>
            Ảnh được lưu sạch (Raw) trong MinIO để bảo vệ Dataset. Ô vuông được vẽ động bằng Metadata.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StatsPanel;
