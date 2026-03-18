"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getCourses, createCourse } from "@/api/course";
import { CourseData } from "@/common/interfaces/course";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  IconButton,
} from "@mui/material";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

const createCourseSchema = z.object({
  course_name: z.string().min(3, "Tên khế ước phải từ 3 ký tự trở lên"),
  term: z.string().min(2, "Học kỳ không hợp lệ"),
  course_type: z.enum(["THEORY", "PRACTICE", "BOTH"]).default("THEORY"),
});

type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

const getCourseTypeName = (type: string) => {
  switch (type) {
    case "THEORY":
      return "Lý thuyết";
    case "PRACTICE":
      return "Thực hành";
    case "BOTH":
      return "Lý thuyết & Thực hành";
    default:
      return type;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);

  const {
    data: courses,
    isLoading,
    isError,
    error,
  } = useQuery<CourseData[]>({
    queryKey: ["my-courses"],
    queryFn: getCourses,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      course_name: "",
      term: "",
      course_type: "THEORY",
    },
  });

  const createMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      setOpenModal(false);
      reset();
    },
  });

  const onSubmit = (data: CreateCourseFormValues) => {
    createMutation.mutate(data);
  };

  const handleClose = () => {
    setOpenModal(false);
    reset();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, #1A1625 0%, #0B0914 80%)",
        pt: 8,
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box mb={6}>
          <Typography variant="h4" color="primary.light" gutterBottom>
            BẢNG ĐIỀU KHIỂN
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Danh sách các khế ước không gian thời gian (Lớp học) của bạn.
          </Typography>
        </Box>

        {isLoading && (
          <Box display="flex" justifyContent="center" mt={10}>
            <CircularProgress color="primary" size={60} />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            Không thể lấy danh sách khế ước. {(error as any)?.message}
          </Alert>
        )}

        {!isLoading && !isError && courses?.length === 0 && (
          <Box
            textAlign="center"
            mt={10}
            p={5}
            sx={{
              border: "1px dashed",
              borderColor: "primary.dark",
              borderRadius: 4,
            }}
          >
            <ImportContactsIcon
              sx={{
                fontSize: 80,
                color: "text.secondary",
                opacity: 0.5,
                mb: 2,
              }}
            />
            <Typography variant="h6" color="text.secondary">
              Vòng lặp đang trống. Bấm dấu + góc dưới để tạo mới.
            </Typography>
          </Box>
        )}

        <Grid container spacing={4}>
          {courses?.map((course) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course._id}>
              <Card
                elevation={12}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "primary.dark",
                  borderRadius: 3,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 24px rgba(123, 31, 162, 0.4)",
                    borderColor: "primary.main",
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {course.course_name}
                    </Typography>
                    <Chip
                      label={course.is_active ? "Đang mở" : "Đã đóng"}
                      color={course.is_active ? "success" : "default"}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Divider
                    sx={{ borderColor: "rgba(255,255,255,0.05)", my: 2 }}
                  />

                  <Box
                    display="flex"
                    alignItems="center"
                    mb={1.5}
                    color="text.secondary"
                  >
                    <CalendarMonthIcon
                      fontSize="small"
                      sx={{ mr: 1, color: "primary.main" }}
                    />
                    <Typography variant="body2">{course.term}</Typography>
                  </Box>

                  <Box
                    display="flex"
                    alignItems="center"
                    mb={1.5}
                    color="text.secondary"
                  >
                    <ImportContactsIcon
                      fontSize="small"
                      sx={{ mr: 1, color: "secondary.main" }}
                    />
                    <Typography variant="body2">
                      {getCourseTypeName(course.course_type)}
                    </Typography>
                  </Box>

                  <Box
                    display="flex"
                    alignItems="center"
                    color="text.secondary"
                  >
                    <GroupsIcon
                      fontSize="small"
                      sx={{ mr: 1, color: "info.main" }}
                    />
                    <Typography variant="body2">
                      {course.student_list?.length || 0} Sinh viên
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={() => router.push(`/course/${course._id}`)}
                    sx={{
                      borderRadius: 2,
                      borderWidth: 2,
                      "&:hover": { borderWidth: 2 },
                    }}
                  >
                    VÀO VÒNG LẶP
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Fab
        color="primary"
        aria-label="add"
        onClick={() => setOpenModal(true)}
        sx={{
          position: "fixed",
          bottom: 40,
          right: 40,
          boxShadow: "0 0 20px rgba(123, 31, 162, 0.6)",
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={openModal}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        sx={{
          backgroundColor: "background.paper",
          backgroundImage: "none",
          border: "1px solid",
          borderColor: "primary.main",
          borderRadius: 3,
          boxShadow: "0 0 30px rgba(123, 31, 162, 0.4)",
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
          <Typography variant="h5" color="primary.light" fontWeight="bold">
            TẠO KHẾ ƯỚC MỚI
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Nghi thức thất bại.{" "}
              {(createMutation.error as any)?.response?.data?.message ||
                "Lỗi máy chủ"}
            </Alert>
          )}

          <Box
            component="form"
            id="create-course-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ mt: 1 }}
          >
            <TextField
              fullWidth
              variant="outlined"
              label="Tên Lớp / Khế Ước"
              {...register("course_name")}
              error={!!errors.course_name}
              helperText={errors.course_name?.message}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              variant="outlined"
              label="Học Kỳ (VD: HK1 2024-2025)"
              {...register("term")}
              error={!!errors.term}
              helperText={errors.term?.message}
              sx={{ mb: 3 }}
            />

            <TextField
              select
              fullWidth
              variant="outlined"
              label="Loại Môn Học"
              {...register("course_type")}
              error={!!errors.course_type}
              helperText={errors.course_type?.message}
              defaultValue="THEORY"
              sx={{ mb: 2 }}
            >
              <MenuItem value="THEORY">Lý thuyết</MenuItem>
              <MenuItem value="PRACTICE">Thực hành</MenuItem>
              <MenuItem value="BOTH">Lý thuyết & Thực hành</MenuItem>
            </TextField>
          </Box>
        </DialogContent>

        <Box sx={{ p: 3, pt: 0, display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={handleClose}
          >
            HỦY
          </Button>
          <Button
            fullWidth
            type="submit"
            form="create-course-form"
            variant="contained"
            color="primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "KHỞI TẠO"
            )}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
