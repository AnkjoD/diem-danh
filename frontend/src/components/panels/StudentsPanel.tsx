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
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { 
  Grid, Card, CardContent, CardActions, Menu, MenuItem, Tooltip, ToggleButton, ToggleButtonGroup
} from '@mui/material';
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
  phone: z.string().min(10, 'SĐT ít nhất 10 số').max(11, 'SĐT tối đa 11 số').optional().or(z.literal('')),
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
      
      // Đọc dạng mảng để xử lý thông minh
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rows.length === 0) return;

      let startIndex = 0;
      let colMap = { code: 0, name: 1, email: 2, phone: 3 };

      const firstRow = rows[0].map(c => String(c || '').toLowerCase().trim());
      const hasHeader = firstRow.some(c => 
        ['mssv', 'mã sv', 'mã số', 'họ tên', 'tên', 'email', 'sđt', 'phone'].includes(c)
      );

      if (hasHeader) {
        startIndex = 1;
        colMap.code = firstRow.findIndex(c => ['mssv', 'mã sv', 'mã số', 'mã số sinh viên', 'student_code'].includes(c));
        colMap.name = firstRow.findIndex(c => ['họ tên', 'tên', 'name', 'full name'].includes(c));
        colMap.email = firstRow.findIndex(c => ['email', 'thư điện tử', 'mail'].includes(c));
        colMap.phone = firstRow.findIndex(c => ['sđt', 'số điện thoại', 'phone', 'tel'].includes(c));
        
        // Fallbacks if some columns not found by name
        if (colMap.code === -1) colMap.code = 0;
        if (colMap.name === -1) colMap.name = 1;
        if (colMap.email === -1) colMap.email = 2;
        if (colMap.phone === -1) colMap.phone = 3;
      }

      const formatted = rows.slice(startIndex).map((row: any[]) => {
        return {
          student_code: String(row[colMap.code] || '').trim(),
          name: String(row[colMap.name] || '').trim(),
          email: colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '',
          phone: colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '',
          teacher_id: user?.id,
        };
      }).filter(s => s.student_code && (startIndex === 0 || s.name));
      
      if (formatted.length > 0) {
        bulkCreateMut.mutate(formatted);
      } else {
        setError('Không tìm thấy dữ liệu hợp lệ trong file');
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
                  message: `Bạn có chắc chắn muốn xóa hồ sơ của ${selected.length} học sinh ra khỏi hệ thống?\n(Dữ liệu điểm danh cũng sẽ bị ảnh hưởng)`,
                  showArchiveOption: true,
                  onConfirm: (archive: boolean) => { bulkDeleteMut.mutate({ ids: selected, archive }); setConfirmDialog(null); }
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
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', lg: 'block' } }}>Tên cột: mssv, name, email, phone</Typography>
          </Box>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
          >
            <ToggleButton value="table" title="Dạng bảng"><ViewListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="grid" title="Dạng lưới"><GridViewIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialog(true)}>Thêm HS</Button>
        </Box>
      </Box>

      {/* Global Selection & Action Bar (Grid View Only) */}
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
                setConfirmDialog({
                  title: 'Xóa hàng loạt',
                  message: `Bạn có chắc chắn muốn xóa hồ sơ của ${selected.length} học sinh ra khỏi hệ thống?\n(Dữ liệu điểm danh cũng sẽ bị ảnh hưởng)`,
                  showArchiveOption: true,
                  onConfirm: (archive: boolean) => { bulkDeleteMut.mutate({ ids: selected, archive }); setConfirmDialog(null); }
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
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <PersonIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
          <Typography color="text.secondary">Chưa có học sinh nào</Typography>
        </Paper>
      ) : (() => {
        if (filteredStudents.length === 0) {
           return (
             <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
               <Typography color="text.secondary">Không tìm thấy kết quả phù hợp</Typography>
             </Paper>
           );
        }

        if (viewMode === 'table') {
          return (
          <TableContainer component={Paper} sx={{ 
            borderRadius: 3, 
            maxHeight: 'calc(100vh - 160px)', 
            overflowY: 'overlay',
            pr: 0,
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { 
              background: 'linear-gradient(to bottom, #a855f7, #ec4899)', 
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': { 
              background: 'linear-gradient(to bottom, #c084fc, #f472b6)', 
            },
            '&::-webkit-scrollbar-button:vertical:start:increment': { display: 'block', height: '16px' },
            '&::-webkit-scrollbar-button:vertical:end:increment': { display: 'block', height: '16px' }
          }}>
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
                            setConfirmDialog({
                              title: 'Xóa học sinh',
                              message: `Bạn có chắc chắn muốn xóa hồ sơ của học sinh ${s.name}?`,
                              showArchiveOption: true,
                              onConfirm: (archive: boolean) => { deleteStudentMut.mutate({ id: s.id, archive }); setConfirmDialog(null); }
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
          );
        }

        // GRID VIEW
        return (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(300px, 1fr))',
              md: 'repeat(auto-fill, minmax(320px, 1fr))',
            },
            gap: 3,
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'overlay',
            p: 1,
            pr: 1.5,
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { 
              background: 'linear-gradient(to bottom, #a855f7, #ec4899)', 
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': { 
              background: 'linear-gradient(to bottom, #c084fc, #f472b6)', 
            },
            '&::-webkit-scrollbar-button:vertical:start:increment': { display: 'block', height: '16px' },
            '&::-webkit-scrollbar-button:vertical:end:increment': { display: 'block', height: '16px' }
          }}>
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
                         <Chip 
                           label="Đã đăng ký" 
                           color="success" 
                           size="small" 
                           sx={{ 
                             bgcolor: 'rgba(34,197,94,0.1)', 
                             borderColor: 'rgba(34,197,94,0.2)',
                             fontWeight: 'bold',
                             border: '1px solid'
                           }} 
                         />
                      ) : (
                         <Chip 
                           label="Thiếu khuôn mặt" 
                           color="warning" 
                           size="small" 
                           variant="outlined" 
                           sx={{ borderStyle: 'dashed' }}
                         />
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
                    {!s.face_descriptor ? (
                      <Button fullWidth variant="outlined" size="small" startIcon={<CameraAltIcon />} onClick={() => setFaceDialog(s)} color="warning">
                        Đăng ký ngay
                      </Button>
                    ) : (
                      <Button fullWidth variant="text" size="small" disabled sx={{ opacity: 0.5 }}>
                        Đã đăng ký
                      </Button>
                    )}
                  </CardActions>

                  <Menu
                    anchorEl={anchorEl[s.id]}
                    open={Boolean(anchorEl[s.id])}
                    onClose={() => handleMenuClose(s.id)}
                  >
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
                      setConfirmDialog({
                        title: 'Xóa học sinh',
                        message: `Bạn có chắc chắn muốn xóa hồ sơ của học sinh ${s.name}?`,
                        showArchiveOption: true,
                        onConfirm: (archive: boolean) => { deleteStudentMut.mutate({ id: s.id, archive }); setConfirmDialog(null); }
                      });
                    }}>
                      <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Xóa hồ sơ
                    </MenuItem>
                  </Menu>
                </Card>
              </Box>
            ))}
          </Box>
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

      {confirmDialog && (
        <ConfirmDialog
          open={true}
           title={confirmDialog.title}
           message={confirmDialog.message}
           showArchiveOption={confirmDialog.showArchiveOption}
           onConfirm={confirmDialog.onConfirm}
           onCancel={() => setConfirmDialog(null)}
           isPending={deleteStudentMut.isPending || bulkDeleteMut.isPending}
         />
       )}
    </Box>
  );
};

export default StudentsPanel;
