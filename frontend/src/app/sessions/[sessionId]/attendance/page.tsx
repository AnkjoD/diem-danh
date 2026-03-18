"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { recognizeFace } from "@/api/student";
import { markStudentAttendance } from "@/api/attendance";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface RecognizedStudent {
  student_id: string;
  full_name: string;
  time: string;
}

export default function AttendanceScannerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isScanning = useRef<boolean>(false);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const [presentStudents, setPresentStudents] = useState<RecognizedStudent[]>(
    [],
  );
  const [scanStatus, setScanStatus] = useState<string>("Sẵn sàng");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
        isScanning.current = true;
        setScanStatus("Đang quét...");
        processFrame();
      }
    } catch (err) {
      setScanStatus("Lỗi: Không thể truy cập Camera");
    }
  };

  const stopCamera = useCallback(() => {
    isScanning.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
      setScanStatus("Đã dừng");
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const processFrame = async () => {
    if (!isScanning.current || !videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          if (isScanning.current) setTimeout(processFrame, 1000);
          return;
        }

        try {
          const aiResult = await recognizeFace(blob, "frame.jpg");

          if (
            aiResult.status === "success" &&
            aiResult.student_id &&
            aiResult.full_name
          ) {
            setPresentStudents((prev) => {
              if (prev.some((s) => s.student_id === aiResult.student_id))
                return prev;

              markStudentAttendance({
                session_id: sessionId,
                student_id: aiResult.student_id!,
                status: "PRESENT",
              }).catch(() => {});

              return [
                {
                  student_id: aiResult.student_id!,
                  full_name: aiResult.full_name!,
                  time: new Date().toLocaleTimeString("vi-VN"),
                },
                ...prev,
              ];
            });
            setScanStatus(`Nhận diện thành công: ${aiResult.full_name}`);
          } else {
            setScanStatus("Đang quét...");
          }
        } catch (error) {
          setScanStatus("Đang kết nối lại AI...");
        }

        if (isScanning.current) {
          setTimeout(processFrame, 1500);
        }
      },
      "image/jpeg",
      0.8,
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, height: "85vh" }}>
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton
          color="primary"
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" color="primary">
          Hệ Thống Điểm Danh Nhận Diện Khuôn Mặt
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ height: "100%" }}>
        <Grid item xs={12} md={8} sx={{ height: "100%" }}>
          <Card
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <CardContent
              sx={{ flex: 1, display: "flex", flexDirection: "column", p: 4 }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Typography variant="h6" fontWeight="bold">
                  Camera AI
                </Typography>
                <Chip
                  label={scanStatus}
                  color={
                    isCameraOn
                      ? scanStatus.includes("thành công")
                        ? "success"
                        : "primary"
                      : "default"
                  }
                  variant={isCameraOn ? "filled" : "outlined"}
                />
              </Box>

              <Box
                sx={{
                  flex: 1,
                  backgroundColor: "background.default",
                  borderRadius: 4,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  border: "2px solid",
                  borderColor: isCameraOn ? "primary.main" : "divider",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isCameraOn ? "block" : "none",
                  }}
                />
                {!isCameraOn && (
                  <Box textAlign="center" color="text.secondary">
                    <VideocamOffIcon
                      sx={{ fontSize: 80, mb: 2, opacity: 0.5 }}
                    />
                    <Typography>Camera đang tắt</Typography>
                  </Box>
                )}
                {isCameraOn && scanStatus === "Đang quét..." && (
                  <Box sx={{ position: "absolute", top: 20, right: 20 }}>
                    <CircularProgress color="primary" size={30} />
                  </Box>
                )}
              </Box>

              <Box display="flex" justifyContent="center" mt={4} gap={3}>
                {!isCameraOn ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={startCamera}
                    startIcon={<VideocamIcon />}
                  >
                    Bật Camera & Quét
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={stopCamera}
                    startIcon={<VideocamOffIcon />}
                  >
                    Dừng Điểm Danh
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4} sx={{ height: "100%" }}>
          <Card
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <CardContent
              sx={{ flex: 1, display: "flex", flexDirection: "column", p: 0 }}
            >
              <Box
                p={3}
                borderBottom={1}
                borderColor="divider"
                backgroundColor="background.paper"
              >
                <Typography variant="h6" fontWeight="bold">
                  Sinh Viên Đã Điểm Danh ({presentStudents.length})
                </Typography>
              </Box>

              <Box flex={1} overflow="auto" p={2}>
                <List>
                  {presentStudents.length === 0 ? (
                    <Typography color="text.secondary" align="center" mt={5}>
                      Chưa có sinh viên nào
                    </Typography>
                  ) : (
                    presentStudents.map((student) => (
                      <ListItem
                        key={student.student_id}
                        sx={{
                          mb: 2,
                          backgroundColor: "background.default",
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.main" }}>
                            <CheckCircleIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography fontWeight="bold">
                              {student.full_name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="primary.light">
                              {student.student_id}
                            </Typography>
                          }
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight="bold"
                        >
                          {student.time}
                        </Typography>
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
