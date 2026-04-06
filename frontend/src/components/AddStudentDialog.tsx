import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const studentSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  studentId: z.string().min(1, 'Mã sinh viên không được để trống'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface AddStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: StudentFormData) => void;
}

const AddStudentDialog = ({ open, onClose, onAdd }: AddStudentDialogProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: '', studentId: '', email: '' },
  });

  const onSubmit = (data: StudentFormData) => {
    onAdd(data);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddAltIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontFamily='"Cinzel", serif'>
            Thêm Học Sinh
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Họ và tên"
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
              />
            )}
          />
          <Controller
            name="studentId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Mã sinh viên"
                error={!!errors.studentId}
                helperText={errors.studentId?.message}
                fullWidth
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email (tuỳ chọn)"
                error={!!errors.email}
                helperText={errors.email?.message}
                fullWidth
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Huỷ
        </Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" color="primary">
          Thêm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStudentDialog;
