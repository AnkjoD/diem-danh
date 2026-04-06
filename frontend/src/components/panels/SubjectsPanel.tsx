import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemSecondaryAction, Select, MenuItem,
  FormControl, InputLabel, Alert, Checkbox, ListItemIcon, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ScienceIcon from '@mui/icons-material/Science';
import GroupIcon from '@mui/icons-material/Group';
import * as XLSX from 'xlsx';
import { getCourses, createCourse, deleteCourse } from '@/common/api/course';
import { getClasses, createClass, deleteClass, getAssignedStudents, assignStudent, unassignStudent, assignBulkStudents } from '@/common/api/class';
import { getStudents } from '@/common/api/student';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';

const subjectSchema = z.object({ name: z.string().min(1, 'Tên môn học không được trống') });
const classSchema = z.object({
  name: z.string().min(1, 'Tên lớp không được trống'),
  type: z.enum(['theory', 'practice', 'both'])
});

const SubjectsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [classDialog, setClassDialog] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [assignDialog, setAssignDialog] = useState<{ classId: string; className: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  const subjectForm = useForm({ resolver: zodResolver(subjectSchema), defaultValues: { name: '' } });
  const classForm = useForm({ resolver: zodResolver(classSchema), defaultValues: { name: '', type: 'theory' as const } });

  // Keyboard Shortcuts for Dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return; // Let the form native submit handle input enters
      
      if (e.key === 'Enter') {
        if (subjectDialog) {
          e.preventDefault();
          subjectForm.handleSubmit((data) => createCourseMut.mutate(data))();
        } else if (classDialog) {
          e.preventDefault();
          classForm.handleSubmit((data) => createClassMut.mutate({ course_id: classDialog, ...data }))();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subjectDialog, classDialog, subjectForm, classForm]);

  // --- Queries ---
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: allClasses = [] } = useQuery({ queryKey: ['classes'], queryFn: () => getClasses() });
  const { data: allStudents = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents, enabled: !!assignDialog });
  const { data: assignedStudents = [] } = useQuery({
    queryKey: ['class_students', assignDialog?.classId],
    queryFn: () => getAssignedStudents(assignDialog!.classId),
    enabled: !!assignDialog,
  });

  const assignedStudentIds = new Set(assignedStudents.map((s: any) => s.id));

  // --- Mutations ---
  const createCourseMut = useMutation({
    mutationFn: createCourse,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courses'] }); setSubjectDialog(false); subjectForm.reset(); },
    onError: (e: any) => setError(e.message)
  });
  
  const deleteCourseMut = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const createClassMut = useMutation({
    mutationFn: createClass,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); setClassDialog(null); classForm.reset(); },
    onError: (e: any) => setError(e.message)
  });

  const deleteClassMut = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });

  const bulkDeleteClassMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => deleteClass(id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });

  const generateAssignMutation = (isAssigning: boolean) => useMutation({
    mutationFn: ({ classId, studentId }: { classId: string, studentId: string }) => 
      isAssigning ? assignStudent(classId, studentId) : unassignStudent(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_students', assignDialog?.classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });

  const assignMut = generateAssignMutation(true);
  const unassignMut = generateAssignMutation(false);

  const bulkAssignMut = useMutation({
    mutationFn: ({ classId, students }: { classId: string, students: any[] }) => assignBulkStudents(classId, students),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_students', assignDialog?.classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e: any) => setError(e.message)
  });

  // --- Handlers ---
  const toggleStudent = (studentId: string) => {
    if (!assignDialog) return;
    if (assignedStudentIds.has(studentId)) {
      unassignMut.mutate({ classId: assignDialog.classId, studentId });
    } else {
      assignMut.mutate({ classId: assignDialog.classId, studentId });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assignDialog) return;
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
        bulkAssignMut.mutate({ classId: assignDialog.classId, students: formatted });
      } else {
        setError('Không tìm thấy dữ liệu hợp lệ trong file (Cần cột: MSSV, Họ tên)');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontFamily='"Cinzel", serif'>Môn Học & Lớp</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSubjectDialog(true)}>Thêm Môn</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {courses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <SchoolIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
          <Typography color="text.secondary">Chưa có môn học nào. Thêm môn học để bắt đầu!</Typography>
        </Paper>
      ) : (
        courses.map((course: any) => {
          const courseClasses = allClasses.filter((c: any) => c.course?.id === course.id);
          const groupedClasses = courseClasses.reduce((acc: any, cls: any) => {
            acc[cls.name] = acc[cls.name] || [];
            acc[cls.name].push(cls);
            return acc;
          }, {});

          return (
          <Accordion key={course.id} sx={{ mb: 1, bgcolor: 'rgba(36,21,48,0.8)', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <MenuBookIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ flex: 1 }}>{course.name}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">Danh sách lớp</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={(e) => { 
                    e.stopPropagation(); 
                    setConfirmDialog({
                      title: 'Xóa môn học',
                      message: `CẢNH BÁO: Xóa môn "${course.name}" sẽ xóa TOÀN BỘ các Lớp, Danh sách học sinh trong lớp và Lịch sử điểm danh của môn này. Vẫn tiếp tục?`,
                      onConfirm: () => { deleteCourseMut.mutate(course.id); setConfirmDialog(null); }
                    });
                  }}>Xoá Môn</Button>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => { setClassDialog(course.id); classForm.reset(); }}>Thêm Lớp</Button>
                </Box>
              </Box>
              <List dense>
                {Object.keys(groupedClasses).map(className => {
                  const items = groupedClasses[className];
                  return (
                    <Box key={className} sx={{ mb: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, p: 1, bgcolor: 'rgba(0,0,0,0.2)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pl: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: 'primary.light' }}>🗃️ {className}</Typography>
                        <IconButton size="small" onClick={() => {
                          setConfirmDialog({
                            title: 'Xóa toàn bộ nhóm lớp',
                            message: `Bạn có chắc chắn muốn xóa toàn bộ nhóm lớp '${className}'?\nHành động này sẽ xóa cả Lý thuyết và Thực hành cùng mọi dữ liệu liên quan.`,
                            onConfirm: () => { bulkDeleteClassMut.mutate(items.map((i: any) => i.id)); setConfirmDialog(null); }
                          });
                        }} sx={{ color: 'error.main' }} disabled={bulkDeleteClassMut.isPending}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {items.map((cls: any) => (
                        <ListItem key={cls.id} sx={{ bgcolor: 'rgba(168,85,247,0.05)', borderRadius: 1, mb: 0.5 }}>
                          <ListItemText
                            disableTypography
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  size="small" 
                                  label={cls.type === 'theory' ? 'Lý thuyết' : cls.type === 'practice' ? 'Thực hành' : 'Lý Thuyết & Thực Hành'}
                                  icon={cls.type === 'theory' ? <MenuBookIcon /> : cls.type === 'practice' ? <ScienceIcon /> : <GroupIcon />}
                                  color={cls.type === 'theory' ? 'primary' : cls.type === 'practice' ? 'secondary' : 'warning'} variant="outlined" 
                                />
                                <Chip size="small" label={`${cls.studentCount || 0} HS`} icon={<GroupIcon />} variant="outlined" sx={{ ml: 1 }} />
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton size="small" onClick={() => setAssignDialog({ classId: cls.id, className: `${cls.name} (${cls.type})` })} sx={{ color: 'primary.main', mr: 1 }}>
                              <GroupIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => {
                               setConfirmDialog({
                                 title: 'Xóa lớp học',
                                 message: `Xóa lớp "${cls.name} (${cls.type === 'theory' ? 'Lý thuyết' : 'Thực hành'})"?\nTOÀN BỘ dữ liệu điểm danh của lớp này sẽ bị xóa bỏ!`,
                                 onConfirm: () => { deleteClassMut.mutate(cls.id); setConfirmDialog(null); }
                               });
                            }} sx={{ color: 'error.main' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </Box>
                  );
                })}
                {courseClasses.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1, fontStyle: 'italic' }}>Chưa có lớp nào</Typography>
                )}
              </List>
            </AccordionDetails>
          </Accordion>
        )})
      )}

      {/* Dialogs */}
      <Dialog open={subjectDialog} onClose={() => setSubjectDialog(false)} fullWidth maxWidth="sm">
        <form onSubmit={subjectForm.handleSubmit((data) => createCourseMut.mutate({ ...data, teacher_id: user?.id }))}>
          <DialogTitle fontFamily='"Cinzel", serif'>Tạo Môn Học Mới</DialogTitle>
          <DialogContent sx={{ mt: 1 }}>
            <Controller name="name" control={subjectForm.control} render={({ field }) => (
              <TextField {...field} label="Tên môn học" fullWidth error={!!subjectForm.formState.errors.name} helperText={subjectForm.formState.errors.name?.message} />
            )} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubjectDialog(false)}>Huỷ (Esc)</Button>
            <Button type="submit" variant="contained" disabled={createCourseMut.isPending}>Thêm (Enter)</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!classDialog} onClose={() => setClassDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontFamily='"Cinzel", serif'>Thêm Lớp</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Controller name="name" control={classForm.control} render={({ field }) => (
            <TextField {...field} label="Tên lớp (VD: Lớp 1)" fullWidth error={!!classForm.formState.errors.name} helperText={classForm.formState.errors.name?.message} />
          )} />
          <Controller name="type" control={classForm.control} render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Loại</InputLabel>
              <Select {...field} label="Loại">
                <MenuItem value="theory">Lý thuyết</MenuItem>
                <MenuItem value="practice">Thực hành</MenuItem>
                <MenuItem value="both">Cả hai (LT & TH)</MenuItem>
              </Select>
            </FormControl>
          )} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassDialog(null)}>Huỷ</Button>
          <Button variant="contained" onClick={classForm.handleSubmit((data) => createClassMut.mutate({ ...data, course_id: classDialog!, teacher_id: user?.id }))}>Thêm</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontFamily='"Cinzel", serif'>Gán học sinh - {assignDialog?.className}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, mt: 1, alignItems: 'center' }}>
             <Button variant="outlined" component="label" disabled={bulkAssignMut.isPending}>
                {bulkAssignMut.isPending ? 'Đang tải...' : 'Nhập danh sách Excel'}
                <input type="file" hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
             </Button>
             <Typography variant="caption" color="text.secondary">Tên cột cần có: mssv, name, email</Typography>
          </Box>
          {(allStudents as any[]).length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Chưa có học sinh nào. Hãy thêm học sinh trước.</Typography>
          ) : (
            <List>
              {(allStudents as any[]).map((student: any) => (
                <ListItem key={student.id} dense onClick={() => toggleStudent(student.id)} component="li" style={{ cursor: 'pointer' }}
                  sx={{ borderRadius: 1, mb: 0.5, bgcolor: assignedStudentIds.has(student.id) ? 'rgba(168,85,247,0.1)' : undefined }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Checkbox edge="start" checked={assignedStudentIds.has(student.id)} disableRipple />
                  </ListItemIcon>
                  <Avatar src={student.photo_url || undefined} sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.dark' }}>
                    {student.name[0]}
                  </Avatar>
                  <ListItemText primary={student.name} secondary={student.student_code} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAssignDialog(null)}>Đóng</Button></DialogActions>
      </Dialog>

      {confirmDialog && (
        <ConfirmDialog
          open={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          isPending={deleteCourseMut.isPending || deleteClassMut.isPending || bulkDeleteClassMut.isPending}
        />
      )}
    </Box>
  );
};


export default SubjectsPanel;
