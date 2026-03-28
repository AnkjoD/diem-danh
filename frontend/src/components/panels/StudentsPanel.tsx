import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Avatar, Alert, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import * as XLSX from 'xlsx';
import FaceRegistration from '@/components/FaceRegistration';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { getStudents, createStudent, deleteStudent, createBulkStudents, updateStudent } from '@/common/api/student';
import { StudentData } from '@/common/interfaces/student';

const studentSchema = z.object({
  name: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  student_code: z.string().min(1, 'Mã SV không được trống'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
});

const StudentsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [faceDialog, setFaceDialog] = useState<StudentData | null>(null);
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  const form = useForm({ resolver: zodResolver(studentSchema), defaultValues: { name: '', student_code: '', email: '' } });

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const createStudentMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeDialog();
    },
    onError: (e: any) => setError(e.message)
  });

  const updateStudentMut = useMutation({
    mutationFn: (data: any) => updateStudent(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeDialog();
    },
    onError: (e: any) => setError(e.message)
  });

  const bulkCreateMut = useMutation({
    mutationFn: createBulkStudents,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); },
    onError: (e: any) => setError(e.message)
  });

  const deleteStudentMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setSelected([]);
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => deleteStudent(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setSelected([]);
    }
  });

  const handleFaceRegistered = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    setFaceDialog(null);
  };

  const closeDialog = () => {
    setAddDialog(false);
    setEditStudent(null);
    form.reset({ name: '', student_code: '', email: '' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input (native form will handle it)
      if (document.activeElement?.tagName === 'INPUT') return;
      
      if (e.key === 'Enter' && addDialog) {
        e.preventDefault();
        form.handleSubmit((data) => {
          if (editStudent) {
            updateStudentMut.mutate({ id: editStudent.id, ...data });
          } else {
            createStudentMut.mutate({ ...data, teacher_id: user?.id });
          }
        })();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addDialog, editStudent, form]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelected(students.map((s: any) => s.id));
    else setSelected([]);
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) setSelected([...selected, id]);
    else setSelected(selected.filter(i => i !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const formatted = data.map((row: any) => {
        const student_code = String(row['MSSV'] || row['Mã SV'] || row['student_code'] || Object.values(row)[0] || '').trim();
        const name = String(row['Họ tên'] || row['Tên'] || row['name'] || Object.values(row)[1] || '').trim();
        const email = String(row['Email'] || row['email'] || '').trim();
        return {
          student_code,
          name,
          email,
          teacher_id: user?.id,
        };
      }).filter(s => s.student_code && s.name);
      
      if (formatted.length > 0) {
        bulkCreateMut.mutate(formatted);
      } else {
        setError('Không tìm thấy dữ liệu hợp lệ trong file (Cần cột: MSSV, Họ tên)');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="h4" fontFamily='"Cinzel", serif'>Học Sinh</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField 
            size="small" 
            placeholder="Tìm MSSV hoặc tên..." 
            variant="outlined" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          {selected.length > 0 && (
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />} 
              onClick={() => {
                setConfirmDialog({
                  title: 'Xóa hàng loạt',
                  message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selected.length} học sinh ra khỏi hệ thống?\n(Dữ liệu điểm danh cũng sẽ bị ảnh hưởng)`,
                  onConfirm: () => { bulkDeleteMut.mutate(selected); setConfirmDialog(null); }
                });
              }}
              disabled={bulkDeleteMut.isPending}
            >
              Xoá {selected.length} HS
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="outlined" component="label" disabled={bulkCreateMut.isPending}>
              Nhập Excel/CSV
              <input type="file" hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', lg: 'block' } }}>Tên cột: mssv, name, email</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialog(true)}>Thêm HS</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {students.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <PersonIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
          <Typography color="text.secondary">Chưa có học sinh nào</Typography>
        </Paper>
      ) : (() => {
        const filteredStudents = students.filter((s: any) => 
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          s.student_code.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredStudents.length === 0) {
           return (
             <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
               <Typography color="text.secondary">Không tìm thấy kết quả phù hợp</Typography>
             </Paper>
           );
        }

        return (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < students.length}
                    checked={students.length > 0 && selected.length === students.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Ảnh</TableCell>
                <TableCell>Mã SV</TableCell>
                <TableCell>Họ tên</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Khuôn mặt</TableCell>
                <TableCell align="center">Xoá</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((s: any) => {
                const isSelected = selected.includes(s.id);
                return (
                  <TableRow key={s.id} hover selected={isSelected} sx={{ cursor: 'pointer' }} onClick={() => handleSelectOne({ target: { checked: !isSelected } } as any, s.id)}>
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onChange={(e) => handleSelectOne(e, s.id)} />
                    </TableCell>
                    <TableCell>
                      <Avatar src={s.photo_url || undefined} sx={{ bgcolor: 'primary.dark' }}>
                        {s.name[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.student_code}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{s.name}</TableCell>
                    <TableCell>{s.email || '—'}</TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      {s.face_descriptor ? (
                        <Chip label="Đã đăng ký" color="success" size="small" variant="outlined" />
                      ) : (
                        <Button size="small" startIcon={<CameraAltIcon />} onClick={() => setFaceDialog(s)} color="warning">
                          Đăng ký
                        </Button>
                      )}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => {
                         setEditStudent(s);
                         form.reset({ name: s.name, student_code: s.student_code, email: s.email || '' });
                         setAddDialog(true);
                      }} sx={{ color: 'primary.main', mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => {
                         setConfirmDialog({
                           title: 'Xóa học sinh',
                           message: `Bạn có chắc chắn muốn xóa hồ sơ của học sinh ${s.name}?`,
                           onConfirm: () => { deleteStudentMut.mutate(s.id); setConfirmDialog(null); }
                         });
                      }} sx={{ color: 'error.main' }}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )
      })()}

      <Dialog open={addDialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={form.handleSubmit((data) => {
             if (editStudent) {
               updateStudentMut.mutate({ id: editStudent.id, ...data });
             } else {
               createStudentMut.mutate({ ...data, teacher_id: user?.id });
             }
        })}>
          <DialogTitle fontFamily='"Cinzel", serif'>{editStudent ? 'Cập Nhật Học Sinh' : 'Thêm Học Sinh'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller name="name" control={form.control} render={({ field }) => (
              <TextField {...field} label="Họ và tên" fullWidth error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} />
            )} />
            <Controller name="student_code" control={form.control} render={({ field }) => (
              <TextField {...field} label="Mã sinh viên" fullWidth error={!!form.formState.errors.student_code} helperText={form.formState.errors.student_code?.message} />
            )} />
            <Controller name="email" control={form.control} render={({ field }) => (
              <TextField {...field} label="Email (tuỳ chọn)" fullWidth />
            )} />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Huỷ (Esc)</Button>
            <Button type="submit" variant="contained" disabled={createStudentMut.isPending || updateStudentMut.isPending}>
              {editStudent ? 'Cập Nhật (Enter)' : 'Thêm (Enter)'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {faceDialog && (
        <FaceRegistration
          student={faceDialog}
          open={!!faceDialog}
          onClose={() => setFaceDialog(null)}
          onRegistered={handleFaceRegistered}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          open={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          isPending={deleteStudentMut.isPending || bulkDeleteMut.isPending}
        />
      )}
    </Box>
  );
};


export default StudentsPanel;
