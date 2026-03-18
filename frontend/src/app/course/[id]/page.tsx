"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getCourseById, addStudentsToCourse } from "@/api/course";
import { createSession, getSessionsByCourse } from "@/api/session";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EventNoteIcon from "@mui/icons-material/EventNote";

const sessionSchema = z
  .object({
    date: z.string().min(1, "Vui lòng chọn ngày học"),
    start_period: z.string().min(1, "Nhập tiết BĐ"),
    end_period: z.string().min(1, "Nhập tiết KT"),
    session_type: z.enum(["THEORY", "PRACTICE"], {
      required_error: "Vui lòng chọn loại buổi học",
    }),
  })
  .refine((data) => Number(data.end_period) >= Number(data.start_period), {
    message: "Phải lớn hơn hoặc bằng tiết bắt đầu",
    path: ["end_period"],
  });

type SessionFormValues = z.infer<typeof sessionSchema>;

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.id as string;

  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [openStudentModal, setOpenStudentModal] = useState(false);
  const [studentTab, setStudentTab] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const [manualStudent, setManualStudent] = useState({
    student_id: "",
    full_name: "",
    email: "",
  });

  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
  } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId),
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["course-sessions", courseId],
    queryFn: () => getSessionsByCourse(courseId),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: "",
      start_period: "1",
      end_period: "3",
      session_type: "THEORY",
    },
  });

  const selectedSessionType = watch("session_type");

  useEffect(() => {
    if (
      course?.course_type === "THEORY" ||
      course?.course_type === "PRACTICE"
    ) {
      setValue("session_type", course.course_type);
    }
  }, [course, setValue]);

  useEffect(() => {
    if (selectedSessionType === "THEORY") {
      setValue("start_period", "1");
      setValue("end_period", "3");
    } else if (selectedSessionType === "PRACTICE") {
      setValue("start_period", "1");
      setValue("end_period", "5");
    }
  }, [selectedSessionType, setValue]);

  const createSessionMutation = useMutation({
    mutationFn: (payload: any) => createSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["course-sessions", courseId],
      });
      setOpenSessionModal(false);
      reset();
    },
    onError: (error: any) =>
      setErrorMessage(error?.response?.data?.message || "Lỗi tạo buổi học"),
  });

  const addStudentMutation = useMutation({
    mutationFn: (students: any[]) => addStudentsToCourse(courseId, students),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      setOpenStudentModal(false);
      setManualStudent({ student_id: "", full_name: "", email: "" });
    },
    onError: (error: any) =>
      setErrorMessage(error?.response?.data?.message || "Lỗi thêm sinh viên"),
  });

  const onSessionSubmit = (data: SessionFormValues) => {
    createSessionMutation.mutate({
      course_id: courseId,
      date: data.date,
      period: `${data.start_period}-${data.end_period}`,
      session_type: data.session_type,
    });
  };

  const handleManualStudentSubmit = () => {
    if (!manualStudent.student_id || !manualStudent.full_name) {
      setErrorMessage("Vui lòng nhập đầy đủ MSSV và Họ tên");
      return;
    }
    addStudentMutation.mutate([manualStudent]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const students = lines
        .slice(1)
        .map((line) => {
          const [student_id, full_name, email] = line
            .split(",")
            .map((item) => item.trim());
          return { student_id, full_name, email };
        })
        .filter((s) => s.student_id && s.full_name);

      if (students.length > 0) {
        addStudentMutation.mutate(students);
      } else {
        setErrorMessage(
          "File không đúng định dạng hoặc không có dữ liệu hợp lệ.",
        );
      }
    };
    reader.readAsText(file);
  };

  if (courseLoading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress color="primary" />
      </Box>
    );
  if (courseError || !course)
    return (
      <Alert severity="error" sx={{ m: 5 }}>
        Không thể tải thông tin Khế ước!
      </Alert>
    );

  const sessionList = Array.isArray(sessions)
    ? sessions
    : sessions?.data || sessions?.sessions || [];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        pt: 5,
        pb: 8,
        backgroundImage:
          "radial-gradient(circle at 50% 0%, #1A1625 0%, #0B0914 80%)",
      }}
    >
      <Container maxWidth="lg">
        <Box display="flex" alignItems="center" mb={4}>
          <IconButton
            onClick={() => router.push("/dashboard")}
            sx={{ color: "primary.light", mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" color="primary.light" fontWeight="bold">
              {course?.course_name}
            </Typography>
            <Box display="flex" gap={2} mt={1}>
              <Chip
                label={course?.term}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                label={course?.course_type}
                color="secondary"
                size="small"
              />
            </Box>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              elevation={24}
              sx={{
                p: 4,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "primary.dark",
                borderRadius: 3,
                boxShadow: "0 0 20px rgba(123, 31, 162, 0.2)",
                minHeight: 400,
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Typography
                  variant="h6"
                  color="primary.light"
                  fontWeight="bold"
                >
                  LỊCH TRÌNH VÒNG LẶP
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenSessionModal(true)}
                >
                  THÊM BUỔI HỌC
                </Button>
              </Box>
              <Divider sx={{ borderColor: "rgba(123, 31, 162, 0.3)", mb: 2 }} />

              {sessionsLoading ? (
                <CircularProgress
                  size={30}
                  sx={{ display: "block", mx: "auto", mt: 5 }}
                />
              ) : sessionList.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={5}>
                  Chưa có dòng thời gian nào được thiết lập.
                </Typography>
              ) : (
                <List>
                  {sessionList.map((session: any) => (
                    <ListItem
                      key={session._id}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.03)",
                        mb: 1,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "rgba(255,255,255,0.1)",
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              session.session_type === "THEORY"
                                ? "primary.main"
                                : "secondary.main",
                          }}
                        >
                          <EventNoteIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography color="text.primary" fontWeight="bold">
                            {session.date}
                          </Typography>
                        }
                        secondary={
                          <Typography color="text.secondary" variant="body2">
                            Tiết: {session.period} •{" "}
                            {session.session_type === "THEORY"
                              ? "Lý thuyết"
                              : "Thực hành"}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={24}
              sx={{
                p: 4,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "primary.dark",
                borderRadius: 3,
                boxShadow: "0 0 20px rgba(123, 31, 162, 0.2)",
              }}
            >
              <Typography
                variant="h6"
                color="primary.light"
                fontWeight="bold"
                mb={3}
              >
                SINH VIÊN KÝ KẾT ({course?.student_list?.length || 0})
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                startIcon={<PersonAddIcon />}
                onClick={() => {
                  setErrorMessage("");
                  setOpenStudentModal(true);
                }}
                sx={{ mb: 3, py: 1.5 }}
              >
                THÊM SINH VIÊN
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Dialog
        open={openSessionModal}
        onClose={() => setOpenSessionModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "primary.main",
            borderRadius: 3,
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "rgba(123, 31, 162, 0.2)",
            pb: 2,
            mb: 2,
          }}
        >
          <Typography variant="h5" color="primary.light" fontWeight="bold">
            THIẾT LẬP BUỔI HỌC
          </Typography>
          <IconButton
            onClick={() => setOpenSessionModal(false)}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="create-session-form"
            onSubmit={handleSubmit(onSessionSubmit)}
            noValidate
            sx={{ mt: 1 }}
          >
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  variant="outlined"
                  label="Ngày học"
                  InputLabelProps={{ shrink: true }}
                  {...register("date")}
                  error={!!errors.date}
                  helperText={errors.date?.message}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  type="text"
                  variant="outlined"
                  label="Tiết BĐ"
                  {...register("start_period")}
                  error={!!errors.start_period}
                  helperText={errors.start_period?.message}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  type="text"
                  variant="outlined"
                  label="Tiết KT"
                  {...register("end_period")}
                  error={!!errors.end_period}
                  helperText={errors.end_period?.message}
                />
              </Grid>
            </Grid>
            <TextField
              select
              fullWidth
              variant="outlined"
              label="Loại buổi học"
              {...register("session_type")}
              disabled={course?.course_type !== "BOTH"}
            >
              {course?.course_type === "THEORY" && (
                <MenuItem value="THEORY">Lý thuyết</MenuItem>
              )}
              {course?.course_type === "PRACTICE" && (
                <MenuItem value="PRACTICE">Thực hành</MenuItem>
              )}
              {course?.course_type === "BOTH" && [
                <MenuItem key="1" value="THEORY">
                  Lý thuyết
                </MenuItem>,
                <MenuItem key="2" value="PRACTICE">
                  Thực hành
                </MenuItem>,
              ]}
            </TextField>
          </Box>
        </DialogContent>
        <Box sx={{ p: 3, pt: 1, display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={() => setOpenSessionModal(false)}
          >
            HỦY
          </Button>
          <Button
            fullWidth
            type="submit"
            form="create-session-form"
            variant="contained"
            color="primary"
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "GHI NHẬN"
            )}
          </Button>
        </Box>
      </Dialog>

      <Dialog
        open={openStudentModal}
        onClose={() => setOpenStudentModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "secondary.main",
            borderRadius: 3,
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h5" color="secondary.light" fontWeight="bold">
            THÊM SINH VIÊN
          </Typography>
          <IconButton
            onClick={() => setOpenStudentModal(false)}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
          <Tabs
            value={studentTab}
            onChange={(_, v) => {
              setStudentTab(v);
              setErrorMessage("");
            }}
            textColor="secondary"
            indicatorColor="secondary"
          >
            <Tab label="Nhập thủ công" />
            <Tab label="Nhập từ Excel/CSV" />
          </Tabs>
        </Box>
        <DialogContent sx={{ minHeight: 250, pt: 3 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          {studentTab === 0 ? (
            <Box>
              <TextField
                fullWidth
                label="Mã Số Sinh Viên (MSSV)"
                variant="outlined"
                sx={{ mb: 2 }}
                value={manualStudent.student_id}
                onChange={(e) =>
                  setManualStudent({
                    ...manualStudent,
                    student_id: e.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                label="Họ và Tên"
                variant="outlined"
                sx={{ mb: 2 }}
                value={manualStudent.full_name}
                onChange={(e) =>
                  setManualStudent({
                    ...manualStudent,
                    full_name: e.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                label="Email (Không bắt buộc)"
                variant="outlined"
                value={manualStudent.email}
                onChange={(e) =>
                  setManualStudent({ ...manualStudent, email: e.target.value })
                }
              />
            </Box>
          ) : (
            <Box>
              <Alert
                severity="info"
                sx={{
                  mb: 3,
                  bgcolor: "rgba(2, 136, 209, 0.1)",
                  color: "info.light",
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Hướng dẫn định dạng file CSV:
                </Typography>
                <Typography variant="body2">
                  File cần có dòng tiêu đề và phân cách bằng dấu phẩy (,)
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    mt: 1,
                    bgcolor: "rgba(0,0,0,0.3)",
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  student_id, full_name, email
                  <br />
                  SV001, Nguyễn Văn A, nva@gmail.com
                  <br />
                  SV002, Trần Thị B, ttb@gmail.com
                </Typography>
              </Alert>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ py: 3, borderStyle: "dashed", borderWidth: 2 }}
              >
                CHỌN FILE CSV TỪ MÁY TÍNH
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>
          )}
        </DialogContent>
        <Box sx={{ p: 3, pt: 1, display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={() => setOpenStudentModal(false)}
          >
            HỦY
          </Button>
          {studentTab === 0 && (
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={handleManualStudentSubmit}
              disabled={addStudentMutation.isPending}
            >
              {addStudentMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "THÊM VÀO LỚP"
              )}
            </Button>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
