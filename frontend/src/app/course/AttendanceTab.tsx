"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCourseById } from "@/api/course";
import { getSessionsByCourse, createSession } from "@/api/session";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  IconButton,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CameraFrontIcon from "@mui/icons-material/CameraFront";
import DownloadIcon from "@mui/icons-material/Download";

export default function AttendanceTab({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);

  const [sessionDate, setSessionDate] = useState("");
  const [sessionType, setSessionType] = useState("THEORY");

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId),
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", courseId],
    queryFn: () => getSessionsByCourse(courseId),
  });

  const mutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", courseId] });
      setOpenDialog(false);
      setSessionDate("");
      setSessionType("THEORY");
    },
  });

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      course_id: courseId,
      date: sessionDate,
      session_type: sessionType,
    });
  };

  if (isLoading)
    return (
      <Box textAlign="center" mt={5}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6" fontWeight="bold" color="text.secondary">
          Danh sách Buổi học
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Tạo Buổi Học Mới
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Ngày Học</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Loại Buổi Học</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                Hành Động
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  Chưa có buổi học nào. Hãy tạo buổi học đầu tiên!
                </TableCell>
              </TableRow>
            ) : (
              sessions?.map((session: any) => (
                <TableRow key={session._id} hover>
                  <TableCell>
                    {new Date(session.date).toLocaleString("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        session.session_type === "THEORY"
                          ? "Lý Thuyết"
                          : "Thực Hành"
                      }
                      color={
                        session.session_type === "THEORY" ? "info" : "secondary"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CameraFrontIcon />}
                      sx={{ mr: 1 }}
                    >
                      Vào Điểm Danh
                    </Button>
                    <IconButton color="success" size="small">
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleCreateSession}>
          <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
            Thêm Buổi Học Mới
          </DialogTitle>
          <DialogContent dividers>
            <Box mb={3}>
              <TextField
                fullWidth
                label="Ngày giờ học"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </Box>

            <FormControl
              component="fieldset"
              disabled={course?.course_type !== "BOTH"}
            >
              <FormLabel component="legend" sx={{ fontWeight: "bold", mb: 1 }}>
                Phân loại buổi học
              </FormLabel>
              <RadioGroup
                row
                value={
                  course?.course_type === "BOTH"
                    ? sessionType
                    : course?.course_type
                }
                onChange={(e) => setSessionType(e.target.value)}
              >
                <FormControlLabel
                  value="THEORY"
                  control={<Radio />}
                  label="Lý thuyết"
                  disabled={course?.course_type === "PRACTICE"}
                />
                <FormControlLabel
                  value="PRACTICE"
                  control={<Radio />}
                  label="Thực hành"
                  disabled={course?.course_type === "THEORY"}
                />
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Tạo"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
