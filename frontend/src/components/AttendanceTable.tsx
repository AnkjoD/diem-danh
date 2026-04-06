import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export type AttendanceStatus = 'present' | 'absent' | 'late' | null;

export interface Student {
  id: string;
  name: string;
  studentId: string;
  email?: string;
  status: AttendanceStatus;
}

interface AttendanceTableProps {
  students: Student[];
  onStatusChange: (id: string, status: AttendanceStatus) => void;
  onDelete: (id: string) => void;
}

const statusConfig = {
  present: { label: 'Có mặt', color: 'success' as const, icon: <CheckCircleIcon fontSize="small" /> },
  absent: { label: 'Vắng', color: 'error' as const, icon: <CancelIcon fontSize="small" /> },
  late: { label: 'Muộn', color: 'warning' as const, icon: <AccessTimeIcon fontSize="small" /> },
};

const AttendanceTable = ({ students, onStatusChange, onDelete }: AttendanceTableProps) => {
  if (students.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          ⏳ Chưa có học sinh nào. Hãy thêm học sinh để bắt đầu điểm danh.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Mã SV</TableCell>
            <TableCell>Họ và tên</TableCell>
            <TableCell align="center">Trạng thái</TableCell>
            <TableCell align="center">Điểm danh</TableCell>
            <TableCell align="center">Xoá</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student, index) => (
            <TableRow
              key={student.id}
              sx={{
                '&:hover': { bgcolor: 'rgba(168, 85, 247, 0.05)' },
                transition: 'background-color 0.2s',
              }}
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{student.studentId}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{student.name}</TableCell>
              <TableCell align="center">
                {student.status ? (
                  <Chip
                    icon={statusConfig[student.status].icon}
                    label={statusConfig[student.status].label}
                    color={statusConfig[student.status].color}
                    size="small"
                    variant="outlined"
                  />
                ) : (
                  <Chip label="Chưa điểm danh" size="small" variant="outlined" sx={{ opacity: 0.5 }} />
                )}
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                  <Tooltip title="Có mặt">
                    <IconButton
                      size="small"
                      onClick={() => onStatusChange(student.id, 'present')}
                      sx={{
                        color: student.status === 'present' ? 'success.main' : 'text.secondary',
                        '&:hover': { color: 'success.main' },
                      }}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Vắng">
                    <IconButton
                      size="small"
                      onClick={() => onStatusChange(student.id, 'absent')}
                      sx={{
                        color: student.status === 'absent' ? 'error.main' : 'text.secondary',
                        '&:hover': { color: 'error.main' },
                      }}
                    >
                      <CancelIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Muộn">
                    <IconButton
                      size="small"
                      onClick={() => onStatusChange(student.id, 'late')}
                      sx={{
                        color: student.status === 'late' ? 'warning.main' : 'text.secondary',
                        '&:hover': { color: 'warning.main' },
                      }}
                    >
                      <AccessTimeIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="center">
                <IconButton size="small" onClick={() => onDelete(student.id)} sx={{ color: 'error.dark' }}>
                  <DeleteOutlineIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AttendanceTable;
