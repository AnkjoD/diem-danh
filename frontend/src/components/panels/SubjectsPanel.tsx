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
import { PremiumScrollContainer } from '../common/PremiumScrollContainer';
import { SectionHeader } from '../common/SectionHeader';
import { EmptyState } from '../common/EmptyState';
import { useConfirm } from '@/hooks/useConfirm';
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
import { fixLocalUrl } from '@/common/utils/url';

const subjectSchema = z.object({ name: z.string().min(1, 'Tên môn học không được trống') });
const classSchema = z.object({
  name: z.string().min(1, 'Tên lớp không được trống'),
  type: z.enum(['theory', 'practice', 'both'])
});

const SubjectsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const openConfirm = useConfirm();
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [classDialog, setClassDialog] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [assignDialog, setAssignDialog] = useState<{ classId: string; className: string } | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

  const subjectForm = useForm({ resolver: zodResolver(subjectSchema), defaultValues: { name: '' } });
  const classForm = useForm({ resolver: zodResolver(classSchema), defaultValues: { name: '', type: 'theory' as const } });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
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

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: allClasses = [] } = useQuery({ queryKey: ['classes'], queryFn: () => getClasses() });
  const { data: allStudents = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents, enabled: !!assignDialog });
  const { data: assignedStudents = [] } = useQuery({
    queryKey: ['class_students', assignDialog?.classId],
    queryFn: () => getAssignedStudents(assignDialog!.classId),
    enabled: !!assignDialog,
  });

  const assignedStudentIds = new Set(assignedStudents.map((s: any) => s.id));

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

  const bulkAssignMut = useMutation({
    mutationFn: ({ classId, students, sync }: { classId: string, students: any[], sync?: boolean }) => assignBulkStudents(classId, students, sync),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_students', assignDialog?.classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e: any) => setError(e.message)
  });

  const toggleStudent = (studentId: string) => {
    if (!assignDialog) return;
    if (assignedStudentIds.has(studentId)) {
      unassignStudent(assignDialog.classId, studentId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['class_students', assignDialog.classId] });
        queryClient.invalidateQueries({ queryKey: ['classes'] });
      });
    } else {
      assignStudent(assignDialog.classId, studentId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['class_students', assignDialog.classId] });
        queryClient.invalidateQueries({ queryKey: ['classes'] });
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!assignDialog) return;
    const filteredInDialog = (allStudents as any[]).filter(s => 
      s.name.toLowerCase().includes(assignSearch.toLowerCase()) || 
      s.student_code.toLowerCase().includes(assignSearch.toLowerCase())
    );
    if (checked) {
      const currentAssigned = (assignedStudents as any[]);
      const currentIds = new Set(currentAssigned.map(s => s.id));
      const studentsToSync = [...currentAssigned];
      filteredInDialog.forEach(s => {
        if (!currentIds.has(s.id)) studentsToSync.push(s);
      });
      const payload = studentsToSync.map(s => ({
        student_code: s.student_code,
        name: s.name,
        email: s.email || '',
        phone: s.phone || '',
      }));
      bulkAssignMut.mutate({ classId: assignDialog.classId, students: payload, sync: true });
    } else {
      const filteredIds = new Set(filteredInDialog.map(s => s.id));
      const studentsToSync = (assignedStudents as any[]).filter(s => !filteredIds.has(s.id));
      const payload = studentsToSync.map(s => ({
        student_code: s.student_code,
        name: s.name,
        email: s.email || '',
        phone: s.phone || '',
      }));
      bulkAssignMut.mutate({ classId: assignDialog.classId, students: payload, sync: true });
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
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rows.length === 0) return;
      let startIndex = 0;
      let colMap = { code: 0, name: 1, email: 2, phone: 3 };
      const firstRow = rows[0].map(c => String(c || '').toLowerCase().trim());
      const hasHeader = firstRow.some(c => ['mssv', 'mã sv', 'mã số', 'họ tên', 'tên', 'email', 'sđt', 'phone'].includes(c));
      if (hasHeader) {
        startIndex = 1;
        colMap.code = firstRow.findIndex(c => ['mssv', 'mã sv', 'mã số', 'mã số sinh viên', 'student_code'].includes(c));
        colMap.name = firstRow.findIndex(c => ['họ tên', 'tên', 'name', 'full name', 'full_name', 'họ và tên'].includes(c));
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
      })).filter(s => s.student_code); 
      if (formatted.length > 0) bulkAssignMut.mutate({ classId: assignDialog.classId, students: formatted });
      else setError('Không tìm thấy dữ liệu MSSV hợp lệ trong file');
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <Box>
      <SectionHeader 
        title="Môn Học & Lớp" 
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSubjectDialog(true)}>Thêm Môn</Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {courses.length === 0 ? (
        <EmptyState 
          icon={<SchoolIcon sx={{ fontSize: 64, opacity: 0.5 }} />}
          title="Chưa có môn học nào"
          message="Thêm môn học để bắt đầu tổ chức lớp học và điểm danh!"
        />
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
                    openConfirm({
                      title: 'Xóa môn học',
                      message: `CẢNH BÁO: Xóa môn "${course.name}" sẽ xóa TOÀN BỘ các Lớp, Danh sách học sinh trong lớp và Lịch sử điểm danh của môn này. Vẫn tiếp tục?`,
                      onConfirm: () => deleteCourseMut.mutate(course.id),
                      isPending: deleteCourseMut.isPending
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
                          openConfirm({
                            title: 'Xóa toàn bộ nhóm lớp',
                            message: `Bạn có chắc chắn muốn xóa toàn bộ nhóm lớp '${className}'?\nHành động này sẽ xóa cả Lý thuyết và Thực hành cùng mọi dữ liệu liên quan.`,
                            onConfirm: () => bulkDeleteClassMut.mutate(items.map((i: any) => i.id)),
                            isPending: bulkDeleteClassMut.isPending
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
                               openConfirm({
                                 title: 'Xóa lớp học',
                                 message: `Xóa lớp "${cls.name} (${cls.type === 'theory' ? 'Lý thuyết' : 'Thực hành'})"?\nTOÀN BỘ dữ liệu điểm danh của lớp này sẽ bị xóa bỏ!`,
                                 onConfirm: () => deleteClassMut.mutate(cls.id),
                                 isPending: deleteClassMut.isPending
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
                  <EmptyState 
                    message="Chưa có lớp nào trong môn học này."
                    sx={{ py: 2, border: 'none', bgcolor: 'transparent' }}
                  />
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
          <Button variant="contained" onClick={classForm.handleSubmit((data) => createClassMut.mutate({ ...data, course_id: classDialog! }))}>Thêm</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontFamily='"Cinzel", serif'>Gán học sinh - {assignDialog?.className}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1, mt: 1 }}>
             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" size="small" component="label" disabled={bulkAssignMut.isPending}>
                    {bulkAssignMut.isPending ? 'Đang tải...' : 'Nhập CSV/Excel'}
                    <input type="file" hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
                </Button>
                <TextField 
                  size="small" 
                  placeholder="Tìm học sinh..." 
                  value={assignSearch} 
                  onChange={(e) => setAssignSearch(e.target.value)} 
                  sx={{ flexgrow: 1, minWidth: 200 }}
                />
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                    {(() => {
                       const filteredInDialog = (allStudents as any[]).filter(s => 
                        s.name.toLowerCase().includes(assignSearch.toLowerCase()) || 
                        s.student_code.toLowerCase().includes(assignSearch.toLowerCase())
                      );
                      const isAllSelected = filteredInDialog.length > 0 && filteredInDialog.every(s => assignedStudentIds.has(s.id));
                      const isSomeSelected = filteredInDialog.length > 0 && filteredInDialog.some(s => assignedStudentIds.has(s.id)) && !isAllSelected;

                      return (
                        <>
                          <Checkbox 
                            size="small"
                            checked={isAllSelected}
                            indeterminate={isSomeSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={bulkAssignMut.isPending}
                          />
                          <Typography variant="body2" sx={{ mr: 1 }}>{isAllSelected ? "Bỏ chọn" : "Chọn tất cả"}</Typography>
                        </>
                      );
                    })()}
                </Box>
             </Box>
             <Typography variant="caption" color="text.secondary">Tên cột mong đợi: mã sv/mssv, họ tên/tên, email, sđt</Typography>
          </Box>
          {(allStudents as any[]).length === 0 ? (
            <EmptyState 
              message="Chưa có học sinh nào. Hãy thêm học sinh trước."
              sx={{ border: 'none', bgcolor: 'transparent' }}
            />
          ) : (
            <PremiumScrollContainer maxHeight="calc(100vh - 250px)" component="box">
              <List sx={{ p: 0 }}>
              {(allStudents as any[])
                .filter(s => s.name.toLowerCase().includes(assignSearch.toLowerCase()) || s.student_code.toLowerCase().includes(assignSearch.toLowerCase()))
                .map((student: any) => (
                <ListItem key={student.id} dense onClick={() => toggleStudent(student.id)} component="li" style={{ cursor: 'pointer' }}
                  sx={{ borderRadius: 1, mb: 0.5, bgcolor: assignedStudentIds.has(student.id) ? 'rgba(168,85,247,0.1)' : undefined }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Checkbox edge="start" checked={assignedStudentIds.has(student.id)} disableRipple />
                  </ListItemIcon>
                  <Avatar src={fixLocalUrl(student.photo_url) || undefined} sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.dark' }}>
                    {student.name[0]}
                  </Avatar>
                  <ListItemText primary={student.name} secondary={student.student_code} />
                </ListItem>
              ))}
              </List>
            </PremiumScrollContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAssignDialog(null)}>Đóng</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubjectsPanel;
