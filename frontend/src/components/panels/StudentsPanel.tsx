import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Avatar, Alert, Table, TableHead, TableBody, TableRow,
  TableCell, Chip, Checkbox, Card, CardContent, CardActions, Menu, MenuItem, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import * as XLSX from 'xlsx';
import FaceRegistration from '@/components/FaceRegistration';
import { ViewModeToggle } from '../common/ViewModeToggle';
import { PremiumScrollContainer } from '../common/PremiumScrollContainer';
import { SectionHeader } from '../common/SectionHeader';
import { ImportButton } from '../common/ImportButton';
import { EmptyState } from '../common/EmptyState';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuth } from '@/contexts/AuthContext';
import { getStudents, createStudent, deleteStudent, createBulkStudents, updateStudent } from '@/common/api/student';
import { StudentData } from '@/common/interfaces/student';

const studentSchema = z.object({
  name: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  student_code: z.string().min(1, 'Mã SV không được trống'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().min(10, 'SĐT ít nhất 10 số').max(11, 'SĐT tối đa 11 số').optional().or(z.literal('')),
});

const StudentsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const openConfirm = useConfirm();
  const [addDialog, setAddDialog] = useState(false);
  const [faceDialog, setFaceDialog] = useState<StudentData | null>(null);
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  const form = useForm({ resolver: zodResolver(studentSchema), defaultValues: { name: '', student_code: '', email: '', phone: '' } });

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
    mutationFn: ({ id, archive }: { id: string, archive: boolean }) => deleteStudent(id, archive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setSelected([]);
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async ({ ids, archive }: { ids: string[], archive: boolean }) => {
      await Promise.all(ids.map(id => deleteStudent(id, archive)));
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
    form.reset({ name: '', student_code: '', email: '', phone: '' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [addDialog, editStudent, form, user?.id]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.student_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelected(filteredStudents.map((s: any) => s.id));
    else setSelected([]);
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) setSelected([...selected, id]);
    else setSelected(selected.filter(i => i !== id));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl({ ...anchorEl, [id]: event.currentTarget });
  };

  const handleMenuClose = (id: string) => {
    setAnchorEl({ ...anchorEl, [id]: null });
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
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rows.length === 0) return;

      let startIndex = 0;
      let colMap = { code: 0, name: 1, email: 2, phone: 3 };
      const firstRow = rows[0].map(c => String(c || '').toLowerCase().trim());
      const hasHeader = firstRow.some(c => ['mssv', 'mã sv', 'mã số', 'họ tên', 'tên', 'email', 'sđt', 'phone'].includes(c));

      if (hasHeader) {
        startIndex = 1;
        colMap.code = firstRow.findIndex(c => ['mssv', 'mã sv', 'mã số', 'mã số sinh viên', 'student_code'].includes(c));
        colMap.name = firstRow.findIndex(c => ['họ tên', 'tên', 'name', 'full name'].includes(c));
        colMap.email = firstRow.findIndex(c => ['email', 'thư điện tử', 'mail'].includes(c));
        colMap.phone = firstRow.findIndex(c => ['sđt', 'số điện thoại', 'phone', 'tel'].includes(c));
        if (colMap.code === -1) colMap.code = 0;
        if (colMap.name === -1) colMap.name = 1;
        if (colMap.email === -1) colMap.email = 2;
        if (colMap.phone === -1) colMap.phone = 3;
      }

      const formatted = rows.slice(startIndex).map((row: any[]) => ({
        student_code: String(row[colMap.code] || '').trim(),
        name: String(row[colMap.name] || '').trim(),
        email: colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '',
        phone: colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '',
        teacher_id: user?.id,
      })).filter(s => s.student_code && (startIndex === 0 || s.name));
      
      if (formatted.length > 0) bulkCreateMut.mutate(formatted);
      else setError('Không tìm thấy dữ liệu hợp lệ trong file');
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <Box>
      <SectionHeader 
        title="Học Sinh" 
        actions={
          <>
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
                  openConfirm({
                    title: 'Xóa hàng loạt',
                    message: `Bạn có chắc chắn muốn xóa hồ sơ của ${selected.length} học sinh ra khỏi hệ thống?\n(Dữ liệu điểm danh cũng sẽ bị ảnh hưởng)`,
                    showArchiveOption: true,
                    onConfirm: (archive: any) => bulkDeleteMut.mutate({ ids: selected, archive: !!archive }),
                    isPending: bulkDeleteMut.isPending
                  });
                }}
                disabled={bulkDeleteMut.isPending}
              >
                Xoá {selected.length} HS
              </Button>
            )}
            
            <ImportButton 
              onFileSelect={handleFileUpload} 
              disabled={bulkCreateMut.isPending} 
            />

            <ViewModeToggle 
              value={viewMode} 
              onChange={setViewMode} 
            />

            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialog(true)}>Thêm HS</Button>
          </>
        }
      />

      {viewMode === 'grid' && (
        <Box sx={{ 
          mb: 2, p: 1.5, 
          bgcolor: 'rgba(168, 85, 247, 0.05)', 
          borderRadius: 3, 
          border: '1px solid rgba(168, 85, 247, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox 
              indeterminate={selected.length > 0 && selected.length < filteredStudents.length}
              checked={filteredStudents.length > 0 && selected.length === filteredStudents.length}
              onChange={handleSelectAll}
            />
            <Typography variant="subtitle2" fontWeight="bold">
              {selected.length > 0 ? `Đã chọn ${selected.length} học sinh` : 'Chọn tất cả (theo bộ lọc)'}
            </Typography>
          </Box>
          {selected.length > 0 && (
            <Button 
              size="small" 
              color="error" 
              startIcon={<DeleteIcon />} 
              onClick={() => {
                openConfirm({
                  title: 'Xóa hàng loạt',
                  message: `Bạn có chắc chắn muốn xóa hồ sơ của ${selected.length} học sinh ra khỏi hệ thống?\n(Dữ liệu điểm danh cũng sẽ bị ảnh hưởng)`,
                  showArchiveOption: true,
                  onConfirm: (archive: any) => bulkDeleteMut.mutate({ ids: selected, archive: !!archive }),
                  isPending: bulkDeleteMut.isPending
                });
              }}
            >
              Xóa vĩnh viễn ({selected.length})
            </Button>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {students.length === 0 ? (
        <EmptyState 
          icon={<PersonIcon sx={{ fontSize: 64, opacity: 0.5 }} />}
          title="Chưa có học sinh nào"
          message="Hãy thêm học sinh đầu tiên hoặc nhập từ file Excel."
        />
      ) : (() => {
        if (filteredStudents.length === 0) {
           return (
             <EmptyState 
                title="Không tìm thấy kết quả"
                message={`Không có học sinh nào khớp với từ khóa "${searchTerm}"`}
             />
           );
        }

        if (viewMode === 'table') {
          return (
          <PremiumScrollContainer>
            <Table stickyHeader>
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
                  <TableCell>SĐT</TableCell>
                  <TableCell align="center">Khuôn mặt</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
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
                      <TableCell>{s.phone || '—'}</TableCell>
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
                        <IconButton size="small" title="Chỉnh sửa" onClick={() => {
                           setEditStudent(s);
                           form.reset({ name: s.name, student_code: s.student_code, email: s.email || '', phone: s.phone || '' });
                           setAddDialog(true);
                        }} sx={{ color: 'primary.main', mr: 1 }}>
                          <EditIcon />
                        </IconButton>
                         <IconButton size="small" title="Xoá" onClick={() => {
                            openConfirm({
                              title: 'Xóa học sinh',
                              message: `Bạn có chắc chắn muốn xóa hồ sơ của học sinh ${s.name}?`,
                              showArchiveOption: true,
                              onConfirm: (archive: any) => deleteStudentMut.mutate({ id: s.id, archive: !!archive }),
                              isPending: deleteStudentMut.isPending
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
          </PremiumScrollContainer>
          );
        }

        return (
          <PremiumScrollContainer component="box" sx={{ p: 1, pr: 1.5 }}>
            {filteredStudents.map((s: any) => (
              <Box key={s.id}>
                <Card sx={{ 
                  borderRadius: 4, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 10 }
                }}>
                  <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Checkbox 
                      size="small" 
                      checked={selected.includes(s.id)} 
                      onChange={(e) => handleSelectOne(e, s.id)}
                    />
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, s.id)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ pt: 1, flexGrow: 1, textAlign: 'center' }}>
                    <Avatar 
                      src={s.photo_url || undefined} 
                      sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '2rem' }}
                    >
                      {s.name[0]}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" noWrap>{s.name}</Typography>
                    <Typography variant="body2" color="text.secondary" fontFamily="monospace" gutterBottom>
                      {s.student_code}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                      {s.email && (
                        <Tooltip title={s.email}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: '100%' }}>
                            <MailOutlineIcon fontSize="inherit" color="disabled" />
                            <Typography variant="caption" noWrap>{s.email}</Typography>
                          </Box>
                        </Tooltip>
                      )}
                      {s.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIphoneIcon fontSize="inherit" color="disabled" />
                          <Typography variant="caption">{s.phone}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      {s.face_descriptor ? (
                         <Chip label="Đã đăng ký" color="success" size="small" variant="outlined" />
                      ) : (
                         <Chip label="Thiếu khuôn mặt" color="warning" size="small" variant="outlined" sx={{ borderStyle: 'dashed' }} />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
                    {!s.face_descriptor ? (
                      <Button fullWidth variant="outlined" size="small" startIcon={<CameraAltIcon />} onClick={() => setFaceDialog(s)} color="warning">
                        Đăng ký ngay
                      </Button>
                    ) : (
                      <Button fullWidth variant="text" size="small" disabled sx={{ opacity: 0.5 }}>Đã đăng ký</Button>
                    )}
                  </CardActions>
                  <Menu anchorEl={anchorEl[s.id]} open={Boolean(anchorEl[s.id])} onClose={() => handleMenuClose(s.id)}>
                    <MenuItem onClick={() => {
                      handleMenuClose(s.id);
                      setEditStudent(s);
                      form.reset({ name: s.name, student_code: s.student_code, email: s.email || '', phone: s.phone || '' });
                      setAddDialog(true);
                    }}>
                      <EditIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> Chỉnh sửa
                    </MenuItem>
                    <MenuItem onClick={() => {
                      handleMenuClose(s.id);
                      openConfirm({
                        title: 'Xóa học sinh',
                        message: `Bạn có chắc chắn muốn xóa hồ sơ của học sinh ${s.name}?`,
                        showArchiveOption: true,
                        onConfirm: (archive: any) => deleteStudentMut.mutate({ id: s.id, archive: !!archive }),
                        isPending: deleteStudentMut.isPending
                      });
                    }}>
                      <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Xóa hồ sơ
                    </MenuItem>
                  </Menu>
                </Card>
              </Box>
            ))}
          </PremiumScrollContainer>
        );
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
              <TextField {...field} label="Email (tuỳ chọn)" fullWidth error={!!form.formState.errors.email} helperText={form.formState.errors.email?.message} />
            )} />
            <Controller name="phone" control={form.control} render={({ field }) => (
              <TextField {...field} label="Số điện thoại (tuỳ chọn)" fullWidth error={!!form.formState.errors.phone} helperText={form.formState.errors.phone?.message} />
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
    </Box>
  );
};

export default StudentsPanel;
