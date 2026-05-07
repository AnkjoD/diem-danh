import { useState, useEffect, useRef } from "react";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import TodayIcon from "@mui/icons-material/Today";
import CollectionsIcon from "@mui/icons-material/Collections";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import QrCodeIcon from "@mui/icons-material/QrCode";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import { QRCodeCanvas } from "qrcode.react";
import { getLocalIP } from "@/common/utils/network";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Avatar,
  CircularProgress,
  TextField,
  Badge,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Divider,
  alpha,
} from "@mui/material";
import { ViewModeToggle } from "../common/ViewModeToggle";
import { PremiumScrollContainer } from "../common/PremiumScrollContainer";
import { SectionHeader } from "../common/SectionHeader";
import { ImportButton } from "../common/ImportButton";
import { EmptyState } from "../common/EmptyState";
import { useConfirm } from "@/hooks/useConfirm";
import { getCourses } from "@/common/api/course";
import { getClasses, getAssignedStudents } from "@/common/api/class";
import {
  createSession,
  getTodaySession,
  updateSession,
} from "@/common/api/session";
import {
  recognizeAttendanceFace,
  markAttendanceManual,
  removeAttendance,
  exportAttendanceToExcel,
  getAttendanceWarnings,
} from "@/common/api/attendance";
import { StudentData } from "@/common/interfaces/student";
import { AttendanceData } from "@/common/interfaces/attendance";
import WarningIcon from "@mui/icons-material/Warning";
import GridOnIcon from "@mui/icons-material/GridOn";
import { fixLocalUrl } from "@/common/utils/url";

const FaceAttendancePanel = () => {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    const savedSubject = sessionStorage.getItem("attendance_selectedSubject");
    const savedClass = sessionStorage.getItem("attendance_selectedClass");
    if (savedSubject) setSelectedSubject(savedSubject);
    if (savedClass) setSelectedClass(savedClass);
  }, []);

  useEffect(() => {
    if (selectedSubject) sessionStorage.setItem("attendance_selectedSubject", selectedSubject);
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedClass) sessionStorage.setItem("attendance_selectedClass", selectedClass);
  }, [selectedClass]);

  const queryClient = useQueryClient();
  const openConfirm = useConfirm();
  const [recognized, setRecognized] = useState<Map<string, string>>(new Map());
  const [scanning, setScanning] = useState(false);
  const [searchAttTerm, setSearchAttTerm] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string>(""); // Lưu ngày của phiên hiện tại (YYYY-MM-DD)
  const [lateThreshold, setLateThreshold] = useState<string>("");
  const [endThreshold, setEndThreshold] = useState<string>("");

  const [resultDialog, setResultDialog] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: "success" | "error";
    students?: StudentData[];
    message?: string;
  } | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [overrideMenu, setOverrideMenu] = useState<{
    anchorEl: HTMLElement;
    studentId: string;
  } | null>(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [serverIp, setServerIp] = useState<string>("");
  const [availableIps, setAvailableIps] = useState<string[]>([]);
  const [manualIp, setManualIp] = useState("");
  const [isCameraMaximized, setIsCameraMaximized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tự động cân chỉnh IP LAN khi Dashboard được mở để tối ưu cho môi trường Docker
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: getCourses,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes", selectedSubject],
    queryFn: () => getClasses(selectedSubject),
    enabled: !!selectedSubject,
  });

  // Kiểm tra nếu dữ liệu từ sessionStorage trỏ tới môn học/lớp học đã bị xóa
  useEffect(() => {
    if (subjects.length > 0 && selectedSubject) {
      if (!subjects.some((s: any) => s.id === selectedSubject)) {
        setSelectedSubject("");
        setSelectedClass("");
        sessionStorage.removeItem("attendance_selectedSubject");
        sessionStorage.removeItem("attendance_selectedClass");
      }
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (classes.length > 0 && selectedClass) {
      if (!classes.some((c: any) => c.id === selectedClass)) {
        setSelectedClass("");
        sessionStorage.removeItem("attendance_selectedClass");
      }
    }
  }, [classes, selectedClass]);
  const { data: classStudents = [] } = useQuery({
    queryKey: ["class_students", selectedClass],
    queryFn: () => getAssignedStudents(selectedClass),
    enabled: !!selectedClass,
  });

  const { data: todaySession, isLoading: isLoadingTodaySession, isFetching: isFetchingTodaySession } = useQuery({
    queryKey: ["today_session", selectedClass],
    queryFn: () => getTodaySession(selectedClass),
    enabled: !!selectedClass,
    refetchInterval: 3000, 
    placeholderData: (previousData) => previousData, 
  });

  const updateSessionMut = useMutation({
    mutationFn: (data: any) => updateSession(sessionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["today_session", selectedClass],
      });
    },
  });

  const createSessionMut = useMutation({
    mutationFn: () => {
      if (
        lateThreshold &&
        endThreshold &&
        !validateTimes(lateThreshold, endThreshold)
      )
        throw new Error("Invalid times");
      const payload: any = { class_id: selectedClass };

      if (lateThreshold) {
        const thresholdDate = new Date();
        const [hours, mins] = lateThreshold.split(":");
        thresholdDate.setHours(parseInt(hours), parseInt(mins), 0, 0);
        payload.late_threshold = thresholdDate.toISOString();
      } else {
        payload.late_threshold = null;
      }

      if (endThreshold) {
        const thresholdDate = new Date();
        const [hours, mins] = endThreshold.split(":");
        thresholdDate.setHours(parseInt(hours), parseInt(mins), 0, 0);
        payload.end_threshold = thresholdDate.toISOString();
      } else {
        payload.end_threshold = null;
      }

      return createSession(payload);
    },
    onSuccess: (data) => {
      const vnTimeZone = "Asia/Ho_Chi_Minh";
      const sDate = new Date(data.created_at).toLocaleDateString("sv-SE", {
        timeZone: vnTimeZone,
      });

      setSessionId(data.id);
      setSessionDate(sDate);
      setRecognized(new Map());
      queryClient.invalidateQueries({
        queryKey: ["today_session", selectedClass],
      });
      if (!qrDialogOpen) {
        startMediaStream();
      }
    },
    onError: (err: any) => {
      setScanResult({
        type: "error",
        message: "Lỗi tạo phiên điểm danh: " + err.message,
      });
      setResultDialog(true);
    },
  });

  const recognizeMut = useMutation({
    mutationFn: ({ files, sId }: { files: File[]; sId: string }) =>
      recognizeAttendanceFace(sId, files),
    onSuccess: (res) => {
      if (res.success && res.students && res.students.length > 0) {
        const newStatusMap = new Map(recognized);
        res.students.forEach((s) => {
          newStatusMap.set(s.id, "present");
        });
        setRecognized(newStatusMap);
        setScanResult({ type: "success", students: res.students });
        setFilesToUpload([]);
        setFilePreviews([]);
        queryClient.invalidateQueries({
          queryKey: ["today_session", selectedClass],
        });
      } else {
        setScanResult({
          type: "error",
          message: res.message || "Hệ thống báo lỗi xử lý!",
        });
      }
    },
    onError: (err: any) => {
      setScanResult({
        type: "error",
        message: err.message || "Không thể kết nối đến AI Service",
      });
    },
  });

  const manualMarkMut = useMutation({
    mutationFn: (payload: {
      student_id: string;
      status: "present" | "late";
      session_id: string;
    }) => markAttendanceManual(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["today_session", selectedClass],
      });
      setOverrideMenu(null);
    },
  });

  const removeMarkMut = useMutation({
    mutationFn: (payload: { student_id: string; session_id: string }) =>
      removeAttendance({ ...payload, archive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["today_session", selectedClass],
      });
      setOverrideMenu(null);
    },
  });
  const { data: warnings = [] } = useQuery({
    queryKey: ["attendance_warnings", selectedClass],
    queryFn: () => getAttendanceWarnings(selectedClass),
    enabled: !!selectedClass,
  });

  const threshold = 0.2;

  useEffect(() => {
    if (scanning) {
      stopScanning();
    }
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    // Nếu chưa chọn lớp thì reset sạch
    if (!selectedClass) {
      setSessionId(null);
      setRecognized(new Map());
      return;
    }

    // Khi có dữ liệu phiên học
    if (todaySession) {
      const vnTimeZone = "Asia/Ho_Chi_Minh";
      const sessionDateStr = new Date(todaySession.created_at).toLocaleDateString("sv-SE", { timeZone: vnTimeZone });

      // Cập nhật ID và ngày và đồng bộ giờ (chỉ làm 1 lần khi session thay đổi để không gián đoạn gõ)
      if (sessionId !== todaySession.id) {
        setSessionId(todaySession.id);
        setSessionDate(sessionDateStr);
        if (todaySession.late_threshold) {
          const date = new Date(todaySession.late_threshold);
          if (!isNaN(date.getTime())) {
            setLateThreshold(`${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`);
          }
        }
        if (todaySession.end_threshold) {
          const date = new Date(todaySession.end_threshold);
          if (!isNaN(date.getTime())) {
            setEndThreshold(`${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`);
          }
        }
      }

      // Cập nhật danh sách sinh viên đã điểm danh (Source of Truth từ DB)
      if (!recognizeMut.isPending) {
        const newStatusMap = new Map(recognized);
        (todaySession.attendances || []).forEach((a: AttendanceData) => {
          if (a.student && (a.status === "present" || a.status === "late")) {
            newStatusMap.set(a.student.id, a.status);
          }
        });
        
        if (newStatusMap.size >= recognized.size) {
           setRecognized(newStatusMap);
        }
      }
    } 
    // CHỈ Reset khi KHÔNG load, KHÔNG fetch và thực sự KHÔNG có dữ liệu
    else if (!isLoadingTodaySession && !isFetchingTodaySession) {
      if (sessionId !== null) {
        setSessionId(null);
        setRecognized(new Map());
        setLateThreshold(localStorage.getItem(`late_${selectedClass}`) || "");
        setEndThreshold(localStorage.getItem(`end_${selectedClass}`) || "");
      }
    }
  }, [todaySession, selectedClass, isLoadingTodaySession, isFetchingTodaySession, recognizeMut.isPending, sessionId]);


  // Giờ trễ < Giờ Kết thúc
  const validateTimes = (late: string, end: string) => {
    if (!late && !end) return true; // Both empty -> OK
    if (!late || !end) return false; // One missing -> NO
    const [lH, lM] = late.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    const lateVal = lH * 60 + lM;
    const endVal = eH * 60 + eM;
    return lateVal < endVal;
  };

  const getTimeError = (late: string, end: string) => {
    if (!late && !end) return "";
    if (late && !end) return "Cần nhập giờ kết thúc";
    if (!late && end) return "Cần nhập giờ bắt đầu trễ";
    const [lH, lM] = late.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    if (lH * 60 + lM >= eH * 60 + eM) return "Phải: Giờ Trễ < Giờ Kết Thúc";
    return "";
  };

  const timeError = getTimeError(lateThreshold, endThreshold);
  const isTimeInvalid = !!timeError;

  const saveDefaults = () => {
    if (!selectedClass) return;
    if (isTimeInvalid) {
      setScanResult({
        type: "error",
        message: "Giờ bắt đầu tính trễ phải NHỎ HƠN giờ kết thúc điểm danh!",
      });
      setResultDialog(true);
      return;
    }
    localStorage.setItem(`late_${selectedClass}`, lateThreshold);
    localStorage.setItem(`end_${selectedClass}`, endThreshold);
    setScanResult({
      type: "success",
      message: "Đã lưu giờ mặc định cho lớp này!",
    });
    setResultDialog(true);
  };

  const restoreDefaults = () => {
    const savedLate = localStorage.getItem(`late_${selectedClass}`) || "";
    const savedEnd = localStorage.getItem(`end_${selectedClass}`) || "";
    setLateThreshold(savedLate);
    setEndThreshold(savedEnd);
    if (sessionId) {
      if (savedLate && savedEnd && !validateTimes(savedLate, savedEnd)) return;
      const lDate = new Date();
      const [lH, lM] = savedLate.split(":");
      lDate.setHours(parseInt(lH), parseInt(lM), 0, 0);

      const eDate = new Date();
      const [eH, eM] = savedEnd.split(":");
      eDate.setHours(parseInt(eH), parseInt(eM), 0, 0);

      updateSessionMut.mutate({
        late_threshold: savedLate ? lDate.toISOString() : null,
        end_threshold: savedEnd ? eDate.toISOString() : null,
      });
    }
  };

  const clearThresholds = () => {
    setLateThreshold("");
    setEndThreshold("");
    localStorage.removeItem(`late_${selectedClass}`);
    localStorage.removeItem(`end_${selectedClass}`);
    if (sessionId) {
      updateSessionMut.mutate({ late_threshold: null, end_threshold: null });
    }
  };

  const unregisteredCount = classStudents.filter(
    (s: StudentData) => !s.face_descriptor,
  ).length;
  const noRegisteredStudents =
    classStudents.length > 0 && unregisteredCount === classStudents.length;

  const recognizedCount = recognized.size;
  const totalStudents = classStudents.length;
  const attendanceProgress =
    totalStudents > 0 ? (recognizedCount / totalStudents) * 100 : 0;



  // Keyboard Shortcuts for Dialog and Capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Enter/Esc to close dialog only if it's currently open AND not loading
      if (resultDialog) {
        if (
          !recognizeMut.isPending &&
          (e.key === "Enter" || e.key === "Escape")
        ) {
          e.preventDefault();
          setResultDialog(false);
        }
        return;
      }

      // If dialog is closed, Camera is ON, and user presses Enter -> Capture & Analyze!
      if (
        scanning &&
        e.key === "Enter" &&
        !recognizeMut.isPending &&
        sessionId
      ) {
        e.preventDefault();
        scanFrame();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultDialog, recognizeMut.isPending, scanning, sessionId]);

  const fetchServerIp = async () => {
    try {
      const { default: http } = await import("@/common/utils/http");
      const hostname = window.location.hostname;

      // Ưu tiên 1: Nếu giáo viên mở dashboard qua IP LAN thật (không phải localhost)
      // thì đây CHẮC CHẮN là IP đúng mà điện thoại cần dùng
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        setServerIp(hostname);
        await http.post("/app/calibrate", { hostIp: hostname });
        return;
      }

      // Ưu tiên 2: Dùng WebRTC để dò IP thật của máy (hoạt động ngay cả trong Docker)
      const webrtcIp = await getLocalIP();
      if (webrtcIp && webrtcIp !== "127.0.0.1") {
        setServerIp(webrtcIp);
        await http.post("/app/calibrate", { hostIp: webrtcIp });
        return;
      }

      // Ưu tiên 3: Lấy danh sách IP từ Backend, chọn IP LAN đầu tiên
      const { data } = await http.get("/app/ip");
      const lanIp = (data.ips || []).find(
        (ip: string) => ip.startsWith("192.168.") || ip.startsWith("10."),
      );
      if (lanIp) {
        setServerIp(lanIp);
        await http.post("/app/calibrate", { hostIp: lanIp });
      }
    } catch (e) {
      console.error("Failed to auto-detect IP", e);
    }
  };

  const handleOpenQr = async () => {
    fetchServerIp();

    const vnTimeZone = "Asia/Ho_Chi_Minh";
    const todayStr = new Date().toLocaleDateString("sv-SE", {
      timeZone: vnTimeZone,
    });

    // Nếu qua ngày mới hoặc chưa có phiên -> Tự động tạo phiên mới và CHỜ (await)
    if (!sessionId || sessionDate !== todayStr) {
      try {
        const sessionData = await createSession({ 
          class_id: selectedClass,
          late_threshold: lateThreshold ? (() => {
            const d = new Date();
            const [h, m] = lateThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined,
          end_threshold: endThreshold ? (() => {
            const d = new Date();
            const [h, m] = endThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined
        });
        const newSDate = new Date(sessionData.created_at).toLocaleDateString("sv-SE", { timeZone: vnTimeZone });
        setSessionId(sessionData.id);
        setSessionDate(newSDate);
        setRecognized(new Map());
        queryClient.invalidateQueries({ queryKey: ["today_session", selectedClass] });
      } catch (err: any) {
        setScanResult({ type: "error", message: "Lỗi tạo phiên tự động: " + err.message });
        setResultDialog(true);
        return;
      }
    }
    setQrDialogOpen(true);
  };

  const startMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      setScanning(true);

      // Yield to React to mount the <video> element before attaching the stream
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }, 100);
    } catch {
      setScanResult({
        type: "error",
        message:
          "Không thể truy cập camera. Vui lòng cấp quyền camera cho trình duyệt.",
      });
      setResultDialog(true);
    }
  };

  const startScanning = async () => {
    const vnTimeZone = "Asia/Ho_Chi_Minh";
    const todayStr = new Date().toLocaleDateString("sv-SE", {
      timeZone: vnTimeZone,
    });

    if (!sessionId || sessionDate !== todayStr) {
      try {
        const sessionData = await createSession({ 
          class_id: selectedClass,
          late_threshold: lateThreshold ? (() => {
            const d = new Date();
            const [h, m] = lateThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined,
          end_threshold: endThreshold ? (() => {
            const d = new Date();
            const [h, m] = endThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined
        });
        const newSDate = new Date(sessionData.created_at).toLocaleDateString("sv-SE", { timeZone: vnTimeZone });
        // Chỉ reset recognized nếu đây là session MỚI (khác ID)
        if (sessionData.id !== sessionId) {
          setRecognized(new Map());
        }
        setSessionId(sessionData.id);
        setSessionDate(newSDate);
        queryClient.invalidateQueries({ queryKey: ["today_session", selectedClass] });
        startMediaStream();
      } catch (err: any) {
        setScanResult({ type: "error", message: "Lỗi tạo phiên: " + err.message });
        setResultDialog(true);
      }
    } else {
      // Session đã tồn tại, mở camera KHÔNG reset danh sách
      startMediaStream();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setFilesToUpload((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessMultiUpload = async () => {
    if (filesToUpload.length === 0) return;

    let currentSessionId = sessionId;
    const vnTimeZone = "Asia/Ho_Chi_Minh";
    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: vnTimeZone });

    if (!currentSessionId || sessionDate !== todayStr) {
      try {
        const sessionData = await createSession({ 
          class_id: selectedClass,
          late_threshold: lateThreshold ? (() => {
            const d = new Date();
            const [h, m] = lateThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined,
          end_threshold: endThreshold ? (() => {
            const d = new Date();
            const [h, m] = endThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined
        });
        const newSDate = new Date(sessionData.created_at).toLocaleDateString("sv-SE", { timeZone: vnTimeZone });
        if (sessionData.id !== sessionId) {
          setRecognized(new Map());
        }
        setSessionId(sessionData.id);
        setSessionDate(newSDate);
        currentSessionId = sessionData.id;
        queryClient.invalidateQueries({ queryKey: ["today_session", selectedClass] });
      } catch (err: any) {
        setScanResult({
          type: "error",
          message: "Lỗi tạo phiên điểm danh: " + err.message,
        });
        setResultDialog(true);
        return;
      }
    }

    setResultDialog(true);
    setScanResult(null);
    recognizeMut.mutate({ files: filesToUpload, sId: currentSessionId });
  };

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || recognizeMut.isPending)
      return;

    let currentSessionId = sessionId;

    // TỰ ĐỘNG CẬP NHẬT PHIÊN KHI QUA NGÀY MỚI (GMT+7)
    const vnTimeZone = "Asia/Ho_Chi_Minh";
    const todayStr = new Date().toLocaleDateString("sv-SE", {
      timeZone: vnTimeZone,
    });

    // Nếu không có phiên hoặc phiên đã qua ngày mới -> Tự động tạo phiên mới
    if (!currentSessionId || sessionDate !== todayStr) {
      try {
        const sessionData = await createSession({ 
          class_id: selectedClass,
          late_threshold: lateThreshold ? (() => {
            const d = new Date();
            const [h, m] = lateThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined,
          end_threshold: endThreshold ? (() => {
            const d = new Date();
            const [h, m] = endThreshold.split(":");
            d.setHours(parseInt(h), parseInt(m), 0, 0);
            return d.toISOString();
          })() : undefined
        });
        const newSDate = new Date(sessionData.created_at).toLocaleDateString("sv-SE", { timeZone: vnTimeZone });
        if (sessionData.id !== sessionId) {
          setRecognized(new Map());
        }
        setSessionId(sessionData.id);
        setSessionDate(newSDate);
        currentSessionId = sessionData.id;

        queryClient.invalidateQueries({
          queryKey: ["today_session", selectedClass],
        });
      } catch (err: any) {
        setScanResult({
          type: "error",
          message: "Lỗi tạo phiên tự động: " + err.message,
        });
        setResultDialog(true);
        return;
      }
    }

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob && currentSessionId) {
          setResultDialog(true);
          setScanResult(null);
          recognizeMut.mutate({
            files: [new File([blob], "capture.jpg", { type: "image/jpeg" })],
            sId: currentSessionId,
          });
        }
      },
      "image/jpeg",
      0.8,
    );
  };

  const stopScanning = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Box>
      <SectionHeader
        title="Điểm Danh Khuôn Mặt"
        actions={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              color: "text.secondary",
              bgcolor: "rgba(255,255,255,0.05)",
              px: 2,
              py: 1,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <TodayIcon color="primary" />
            <Typography
              variant="subtitle1"
              fontWeight={500}
              sx={{ textTransform: "capitalize" }}
            >
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          </Box>
        }
      />

      {selectedClass && classStudents.length > 0 && unregisteredCount > 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            borderRadius: 2,
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <strong>Lưu ý:</strong> Có {unregisteredCount} học sinh trong lớp chưa
          đăng ký khuôn mặt! Hãy nhắc các em đăng ký sớm để hệ thống có thể nhận
          diện chính xác.
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {classStudents
              .filter((s: StudentData) => !s.face_descriptor)
              .map((s: StudentData) => (
                <Chip
                  key={s.id}
                  label={`${s.name} (${s.student_code})`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              ))}
          </Box>
        </Alert>
      )}
      {/* Warning Banner moved to top */}
      {warnings.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: alpha("#f59e0b", 0.1),
            color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.2)",
            width: "100%",
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Phát hiện sinh viên vắng nhiều ({threshold * 100}%):
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
            {warnings.map((w: any) => (
              <Chip
                key={w.student.id}
                label={`${w.student.name} (Vắng ${w.ratio}%)`}
                size="small"
                sx={{
                  bgcolor: "rgba(245,158,11,0.1)",
                  color: "#f59e0b",
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            mb: selectedClass ? 3 : 0,
          }}
        >
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Môn học</InputLabel>
            <Select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedClass("");
              }}
              label="Môn học"
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Lớp</InputLabel>
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              label="Lớp"
              disabled={!selectedSubject}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} (
                  {c.type === "theory"
                    ? "LT"
                    : c.type === "practice"
                      ? "TH"
                      : "LT+TH"}
                  )
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!scanning ? (
            <Button
              variant="contained"
              startIcon={
                createSessionMut.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  <PlayArrowIcon />
                )
              }
              onClick={startScanning}
              disabled={
                !selectedClass ||
                classStudents.length === 0 ||
                createSessionMut.isPending ||
                isTimeInvalid
              }
            >
              Mở Camera
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={stopScanning}
            >
              Tắt Camera
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={handleOpenQr}
            disabled={!selectedClass || classStudents.length === 0}
            sx={{
              borderColor: "rgba(168,85,247,0.5)",
              color: "#c084fc",
              "&:hover": {
                borderColor: "#c084fc",
                bgcolor: "rgba(168,85,247,0.05)",
              },
            }}
          >
            Điểm danh qua Phone
          </Button>




          <ImportButton
            onFileSelect={handleFileUpload}
            disabled={
              !selectedClass ||
              classStudents.length === 0 ||
              recognizeMut.isPending ||
              isTimeInvalid ||
              isLoadingTodaySession
            }
            label="Tải ảnh lên"
            tooltip="Chọn một hoặc nhiều ảnh tập thể lớp (Ctrl+Click để chọn nhiều)"
            accept="image/*"
            multiple={true}
          />
        </Box>

        {filesToUpload.length > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: "1px dashed rgba(255,255,255,0.2)",
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <CollectionsIcon fontSize="small" color="primary" />
                Danh sách ảnh đã chọn ({filesToUpload.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    setFilesToUpload([]);
                    setFilePreviews([]);
                  }}
                >
                  Xóa tất cả
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleProcessMultiUpload}
                  disabled={recognizeMut.isPending}
                >
                  {recognizeMut.isPending
                    ? "Đang xử lý..."
                    : "Bắt đầu điểm danh"}
                </Button>
              </Box>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: 2,
                mt: 1,
              }}
            >
              {filePreviews.map((url, i) => (
                <Box key={i}>
                  <Box
                    sx={{
                      position: "relative",
                      pt: "100%",
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      transition: "transform 0.2s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        border: "1px solid #7c3aed",
                      },
                    }}
                    onClick={() => setPreviewImageUrl(url)}
                  >
                    <img
                      src={url}
                      alt="preview"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "rgba(0,0,0,0.5)",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedFile(i);
                      }}
                    >
                      <HighlightOffIcon sx={{ color: "#fff", fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {selectedClass && (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
              pt: 2,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <TextField
              label="Bắt đầu tính đi trễ từ"
              type="time"
              value={lateThreshold}
              onChange={(e) => setLateThreshold(e.target.value)}
              size="small"
              error={isTimeInvalid}
              helperText={timeError ? timeError : "Có thể bỏ trống cả 2"}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: 180,
                "& input::-webkit-calendar-picker-indicator": {
                  filter: "invert(1)",
                  cursor: "pointer",
                },
              }}
              onBlur={() => {
                if (!sessionId) return;
                if (isTimeInvalid) return;
                const thresholdDate = new Date();
                const [hours, mins] = lateThreshold.split(":");
                thresholdDate.setHours(parseInt(hours), parseInt(mins), 0, 0);
                updateSessionMut.mutate({
                  late_threshold: thresholdDate.toISOString(),
                });
              }}
            />

            <TextField
              label="Kết thúc điểm danh tại"
              type="time"
              value={endThreshold}
              onChange={(e) => setEndThreshold(e.target.value)}
              size="small"
              error={isTimeInvalid}
              helperText={timeError ? timeError : "Có thể bỏ trống cả 2"}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: 180,
                "& input::-webkit-calendar-picker-indicator": {
                  filter: "invert(1)",
                  cursor: "pointer",
                },
              }}
              onBlur={() => {
                if (!sessionId) return;
                if (isTimeInvalid) return;
                const thresholdDate = new Date();
                const [hours, mins] = endThreshold.split(":");
                thresholdDate.setHours(parseInt(hours), parseInt(mins), 0, 0);
                updateSessionMut.mutate({
                  end_threshold: thresholdDate.toISOString(),
                });
              }}
            />

            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={clearThresholds}
              sx={{ height: 38, opacity: 0.7 }}
            >
              Xóa hết
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={restoreDefaults}
              sx={{ height: 38, opacity: 0.8 }}
            >
              Phục hồi mặc định
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={saveDefaults}
              disabled={!selectedClass || isTimeInvalid}
              sx={{ borderStyle: "dashed", height: 38 }}
            >
              Lưu mặc định
            </Button>
          </Box>
        )}
      </Paper>

      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexDirection: { xs: "column", md: "row" },
          alignItems: "flex-start", // Ngăn khung Camera bị kéo dài theo danh sách bên phải
        }}
      >
        <Paper
          sx={{
            borderRadius: 4, // Giảm bo góc để không che khuất icon
            overflow: "hidden",
            flex: "0 0 auto",
            width: { xs: "100%", md: 560 },
            border: "1px solid rgba(255,255,255,0.05)",
            bgcolor: "rgba(255,255,255,0.02)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            position: "relative",
          }}
        >
          {scanning ? (
            <Box
              sx={{
                position: "relative",
                borderRadius: 4,
                overflow: "hidden",
                bgcolor: "#000",
                aspectRatio: "4/3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background:
                    "linear-gradient(to right, transparent, #c084fc, transparent)",
                  boxShadow: "0 0 15px #c084fc",
                  zIndex: 2,
                  animation: "scan-line 3s linear infinite",
                  "@keyframes scan-line": {
                    "0%": { top: "0%" },
                    "100%": { top: "100%" },
                  },
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 10,
                }}
              >
                <Button
                  variant="contained"
                  size="medium"
                  onClick={scanFrame}
                  sx={{
                    borderRadius: 8,
                    px: 3,
                    py: 1,
                    bgcolor: "#6366f1",
                    backgroundImage:
                      "linear-gradient(135deg, #6366f1, #a855f7)",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    textTransform: "none",
                    boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
                    "&:hover": {
                      filter: "brightness(1.1)",
                      boxShadow: "0 6px 20px rgba(99,102,241,0.6)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Chụp & Điểm Danh
                </Button>
              </Box>

              {/* Nút phóng to chuyên nghiệp */}
              <IconButton
                onClick={() => setIsCameraMaximized(true)}
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  bgcolor: "rgba(0,0,0,0.6)",
                  color: "white",
                  backdropFilter: "blur(4px)",
                  "&:hover": { bgcolor: "rgba(168,85,247,0.8)" },
                  zIndex: 15,
                }}
              >
                <GridViewIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 420,
                p: 4,
              }}
            >
              <CameraAltIcon
                sx={{ fontSize: 80, opacity: 0.1, mb: 2, color: "#c084fc" }}
              />
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ opacity: 0.8, mb: 1 }}
              >
                Chưa có dữ liệu
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.4, textAlign: "center" }}
              >
                Chọn môn và lớp rồi bắt đầu điểm danh
              </Typography>
            </Box>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Paper>

        {/* Dialog Phóng to Camera toàn màn hình */}
        <Dialog
          open={isCameraMaximized}
          onClose={() => setIsCameraMaximized(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "#000",
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
              maxHeight: "95vh",
            },
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "80vh", // Cố định chiều cao để không bị tràn
              bgcolor: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={(el) => {
                if (el && videoRef.current) {
                  el.srcObject = videoRef.current.srcObject;
                }
              }}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transform: "scaleX(-1)",
              }}
            />

            {/* Overlay hiệu ứng khi phóng to */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background:
                  "linear-gradient(to right, transparent, #c084fc, transparent)",
                boxShadow: "0 0 20px #c084fc",
                animation: "scan-line 5s linear infinite",
                zIndex: 5,
              }}
            />

            <Box
              sx={{
                position: "absolute",
                bottom: 40,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  scanFrame();
                  setIsCameraMaximized(false);
                }}
                sx={{
                  borderRadius: 10,
                  px: 6,
                  py: 2,
                  bgcolor: "#6366f1",
                  backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7)",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                  "&:hover": { transform: "scale(1.05)" },
                }}
              >
                Chụp ảnh & Điểm danh
              </Button>
            </Box>

            <IconButton
              onClick={() => setIsCameraMaximized(false)}
              sx={{
                position: "absolute",
                top: 20,
                right: 20,
                bgcolor: "rgba(255,255,255,0.1)",
                color: "white",
                backdropFilter: "blur(10px)",
                "&:hover": { bgcolor: "rgba(255,0,0,0.6)" },
                zIndex: 25,
              }}
            >
              <HighlightOffIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </Box>
        </Dialog>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Tìm MSSV hoặc tên học sinh..."
              variant="outlined"
              fullWidth
              value={searchAttTerm}
              onChange={(e: any) => setSearchAttTerm(e.target.value)}
              disabled={classStudents.length === 0}
            />
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </Box>
          {selectedClass && classStudents.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 2,
                bgcolor: "rgba(255,255,255,0.03)",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="bold"
                      sx={{ letterSpacing: 1.2 }}
                    >
                      TIẾN ĐỘ ĐIỂM DANH ({recognizedCount}/{totalStudents})
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      sx={{
                        fontWeight: "bold",
                        textShadow: "0 0 8px rgba(168, 85, 247, 0.5)",
                      }}
                    >
                      {Math.round(attendanceProgress)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={attendanceProgress}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: "rgba(255,255,255,0.08)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 5,
                        transition: "transform 0.4s ease",
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Badge
                      badgeContent={
                        Array.from(recognized.values()).filter(
                          (v) => v === "present",
                        ).length
                      }
                      color="success"
                      showZero
                      overlap="rectangular"
                      sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                    >
                      <Chip
                        label="Có mặt"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          py: 1.8,
                          px: 0.5,
                          bgcolor: "rgba(34,197,94,0.1)",
                          border: "1px solid rgba(34,197,94,0.2)",
                        }}
                        color="success"
                        variant="outlined"
                      />
                    </Badge>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Badge
                      badgeContent={
                        Array.from(recognized.values()).filter(
                          (v) => v === "late",
                        ).length
                      }
                      color="warning"
                      showZero
                      overlap="rectangular"
                      sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                    >
                      <Chip
                        label="Đi muộn"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          py: 1.8,
                          px: 0.5,
                          bgcolor: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.2)",
                        }}
                        color="warning"
                        variant="outlined"
                      />
                    </Badge>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Badge
                      badgeContent={totalStudents - recognized.size}
                      color="error"
                      showZero
                      overlap="rectangular"
                      sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                    >
                      <Chip
                        label="Vắng"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          py: 1.8,
                          px: 0.5,
                          opacity: 0.8,
                          bgcolor: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                        color="error"
                        variant="outlined"
                      />
                    </Badge>
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}
          {classStudents.length > 0 ? (
            (() => {
              const filteredClassStudents = classStudents.filter(
                (s: StudentData) =>
                  s.name.toLowerCase().includes(searchAttTerm.toLowerCase()) ||
                  s.student_code
                    .toLowerCase()
                    .includes(searchAttTerm.toLowerCase()),
              );
              return viewMode === "table" ? (
                <PremiumScrollContainer maxHeight="calc(100vh - 220px)">
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ảnh</TableCell>
                        <TableCell>Họ tên</TableCell>
                        <TableCell>Mã SV</TableCell>
                        <TableCell align="center">Trạng thái</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredClassStudents.map((s: StudentData) => (
                        <TableRow
                          key={s.id}
                          sx={{
                            bgcolor: recognized.has(s.id)
                              ? recognized.get(s.id) === "late"
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(34,197,94,0.1)"
                              : undefined,
                            transition: "background-color 0.5s",
                          }}
                        >
                          <TableCell>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                              }}
                              variant="dot"
                              color={
                                recognized.get(s.id) === "present"
                                  ? "success"
                                  : recognized.get(s.id) === "late"
                                    ? "warning"
                                    : "error"
                              }
                              sx={{
                                "& .MuiBadge-badge": {
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  border: "2px solid #1e1e1e",
                                  bgcolor: !recognized.has(s.id)
                                    ? "#666"
                                    : undefined,
                                },
                              }}
                            >
                              <Avatar
                                src={fixLocalUrl(s.photo_url) || undefined}
                                sx={{ width: 32, height: 32 }}
                                imgProps={{ crossOrigin: "anonymous" }}
                              >
                                {s.name[0]}
                              </Avatar>
                            </Badge>
                          </TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>
                            {s.student_code}
                          </TableCell>
                          <TableCell align="center">
                            {recognized.has(s.id) ? (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label={
                                  recognized.get(s.id) === "late"
                                    ? "Đi muộn"
                                    : "Có mặt"
                                }
                                color={
                                  recognized.get(s.id) === "late"
                                    ? "warning"
                                    : "success"
                                }
                                size="small"
                                onClick={(e) =>
                                  setOverrideMenu({
                                    anchorEl: e.currentTarget,
                                    studentId: s.id,
                                  })
                                }
                              />
                            ) : (
                              <Chip
                                label="Vắng / Chờ"
                                size="small"
                                variant="outlined"
                                sx={{ opacity: 0.5 }}
                                onClick={(e) =>
                                  setOverrideMenu({
                                    anchorEl: e.currentTarget,
                                    studentId: s.id,
                                  })
                                }
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </PremiumScrollContainer>
              ) : (
                // GRID VIEW
                <PremiumScrollContainer
                  component="box"
                  maxHeight="calc(100vh - 220px)"
                  sx={{ p: 0.5, pr: 1.5 }}
                >
                  {filteredClassStudents.map((s: StudentData) => {
                    const status = recognized.get(s.id);
                    const isPresent = status === "present";
                    const isLate = status === "late";
                    return (
                      <Box key={s.id}>
                        <Card
                          sx={{
                            borderRadius: 3,
                            height: "100%",
                            border: "1px solid",
                            borderColor: isPresent
                              ? "rgba(34,197,94,0.3)"
                              : isLate
                                ? "rgba(245,158,11,0.3)"
                                : "rgba(255,255,255,0.08)",
                            bgcolor: isPresent
                              ? "rgba(34,197,94,0.05)"
                              : isLate
                                ? "rgba(245,158,11,0.05)"
                                : "rgba(255,255,255,0.02)",
                            transition: "all 0.3s ease",
                            boxShadow: s.face_descriptor
                              ? "0 0 10px rgba(168, 85, 247, 0.15)"
                              : "none",
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: s.face_descriptor
                                ? "0 0 15px rgba(168, 85, 247, 0.3)"
                                : 6,
                            },
                          }}
                        >
                          <CardContent
                            sx={{
                              p: 2,
                              "&:last-child": { pb: 2 },
                              display: "flex",
                              flexDirection: "column",
                              height: "100%",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Badge
                                overlap="circular"
                                anchorOrigin={{
                                  vertical: "bottom",
                                  horizontal: "right",
                                }}
                                badgeContent={
                                  isPresent ? (
                                    <CheckCircleIcon
                                      sx={{ fontSize: 16, color: "#22c55e" }}
                                    />
                                  ) : isLate ? (
                                    <AccessTimeIcon
                                      sx={{ fontSize: 16, color: "#f59e0b" }}
                                    />
                                  ) : (
                                    <PersonOffIcon
                                      sx={{ fontSize: 16, color: "#ef4444" }}
                                    />
                                  )
                                }
                              >
                                <Avatar
                                  src={fixLocalUrl(s.photo_url) || undefined}
                                  sx={{
                                    width: 50,
                                    height: 50,
                                    border: "2px solid rgba(255,255,255,0.1)",
                                  }}
                                  imgProps={{ crossOrigin: "anonymous" }}
                                >
                                  {s.name[0]}
                                </Avatar>
                              </Badge>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  noWrap
                                >
                                  {s.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontFamily="monospace"
                                >
                                  {s.student_code}
                                </Typography>
                              </Box>
                              <Box
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOverrideMenu({
                                    anchorEl: e.currentTarget,
                                    studentId: s.id,
                                  });
                                }}
                              >
                                {isPresent ? (
                                  <Chip
                                    label="Có mặt"
                                    size="small"
                                    color="success"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      cursor: "pointer",
                                    }}
                                  />
                                ) : isLate ? (
                                  <Chip
                                    label="Đi muộn"
                                    size="small"
                                    color="warning"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      cursor: "pointer",
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    label="Vắng"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      opacity: 0.6,
                                      cursor: "pointer",
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    );
                  })}
                </PremiumScrollContainer>
              );
            })()
          ) : selectedClass ? (
            <EmptyState
              icon={<PersonOffIcon sx={{ fontSize: 64, opacity: 0.3 }} />}
              message="Lớp này chưa có học sinh."
            />
          ) : null}
        </Box>
      </Box>

      {/* Kết Quả Điểm Danh Modal */}
      <Dialog
        open={resultDialog}
        onClose={() => {
          if (!recognizeMut.isPending) setResultDialog(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 5,
            bgcolor: "background.paper",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0))",
          }
        }}
      >
        <DialogTitle
          fontFamily='"Cinzel", serif'
          textAlign="center"
          variant="h5"
          sx={{ pt: 3 }}
        >
          {scanResult?.type === "success" ? "Thông Tin Điểm Danh" : "Thông Báo"}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 4, overflow: "hidden", px: 1 }}>
          {recognizeMut.isPending ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                my: 4,
              }}
            >
              <CircularProgress size={80} thickness={4} />
              <Typography variant="h6" color="primary" fontWeight="bold">
                AI đang phân tích khuôn mặt...
              </Typography>
            </Box>
          ) : scanResult ? (
            scanResult.type === "success" && scanResult.students ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  Điểm danh thành công!
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Đã nhận diện được {scanResult.students.length} học sinh
                </Typography>

                {/* HIỂN THỊ ẢNH QUÉT VỚI Ô VUÔNG VẼ BẰNG SVG (Tiết kiệm bộ nhớ MinIO) */}
                {(scanResult as any).photoUrl && (
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      maxWidth: 400,
                      borderRadius: 3,
                      overflow: "hidden",
                      border: "2px solid rgba(168, 85, 247, 0.3)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      my: 1,
                    }}
                  >
                    <img
                      src={(scanResult as any).photoUrl}
                      alt="Scan result"
                      style={{ width: "100%", display: "block" }}
                    />
                    {/* Lớp SVG vẽ đè ô vuông */}
                    <svg
                      viewBox={`0 0 ${(scanResult as any).imgWidth || 1} ${(scanResult as any).imgHeight || 1}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                      }}
                    >
                      {(scanResult as any).bboxes?.map((bbox: number[], idx: number) => {
                        const [x1, y1, x2, y2] = bbox;
                        return (
                          <rect
                            key={idx}
                            x={x1}
                            y={y1}
                            width={x2 - x1}
                            height={y2 - y1}
                            fill="none"
                            stroke="#c084fc"
                            strokeWidth="4"
                          />
                        );
                      })}
                    </svg>
                  </Box>
                )}

                <PremiumScrollContainer
                  component="box"
                  maxHeight="60vh"
                  sx={{ 
                    p: 1, 
                    width: "100%", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center",
                    gap: 2.5,
                    // Ẩn thanh cuộn nhưng vẫn cho phép kéo
                    "&::-webkit-scrollbar": { display: "none" },
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                  }}
                >
                  {scanResult.students.map((student) => (
                    <Paper
                      key={student.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        width: "92%", // Dài hơn một xíu nữa theo ý bạn
                        mx: "auto", // Đảm bảo nằm chính giữa box
                        bgcolor: "rgba(34,197,94,0.05)",
                        border: "1px solid rgba(34,197,94,0.2)",
                        transition: "all 0.2s",
                        "&:hover": { bgcolor: "rgba(34,197,94,0.1)", transform: "scale(1.01)" }
                      }}
                    >
                      <Avatar
                        src={fixLocalUrl(student.photo_url) || undefined}
                        sx={{
                          width: 64,
                          height: 64,
                          border: "2px solid #fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                        imgProps={{ crossOrigin: "anonymous" }}
                      >
                        {student.name?.[0]}
                      </Avatar>
                      <Box sx={{ textAlign: "left" }}>
                        <Typography variant="h6" fontWeight="bold">
                          {student.name}
                        </Typography>
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace", fontWeight: "bold" }}
                        >
                          MSSV: {student.student_code}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </PremiumScrollContainer>
              </Box>
            ) : scanResult.type === "success" && !scanResult.students ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  my: 2,
                }}
              >
                <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  Thành công!
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                  {scanResult.message}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  my: 2,
                }}
              >
                <WarningAmberIcon color="error" sx={{ fontSize: 100 }} />
                <Typography variant="h4" color="error.main" fontWeight="bold">
                  Thông báo!
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                  {scanResult.message}
                </Typography>
              </Box>
            )
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => setResultDialog(false)}
            disabled={recognizeMut.isPending}
            sx={{ minWidth: 240, borderRadius: 8, py: 1.5, fontSize: "1.1rem" }}
          >
            Đóng / Tiếp Tục (Enter)
          </Button>
        </DialogActions>
      </Dialog>
      {/* Zoom Preview Dialog */}
      <Dialog
        open={!!previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
        maxWidth="lg"
      >
        <Box sx={{ position: "relative", bgcolor: "#000" }}>
          <IconButton
            onClick={() => setPreviewImageUrl(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.5)",
            }}
          >
            <HighlightOffIcon />
          </IconButton>
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Zoomed"
              style={{ maxWidth: "100%", maxHeight: "90vh", display: "block" }}
            />
          )}
        </Box>
      </Dialog>

      {/* Manual Override Menu */}
      <Menu
        anchorEl={overrideMenu?.anchorEl}
        open={Boolean(overrideMenu)}
        onClose={() => setOverrideMenu(null)}
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            border: "1px solid rgba(168, 85, 247, 0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            borderRadius: 2,
          },
        }}
      >
        <MenuItem
          onClick={() =>
            sessionId &&
            overrideMenu &&
            manualMarkMut.mutate({
              student_id: overrideMenu.studentId,
              status: "present",
              session_id: sessionId,
            })
          }
        >
          <CheckCircleIcon
            sx={{ mr: 1, color: "success.main", fontSize: 20 }}
          />{" "}
          Đánh dấu: Có mặt
        </MenuItem>
        <MenuItem
          onClick={() =>
            sessionId &&
            overrideMenu &&
            manualMarkMut.mutate({
              student_id: overrideMenu.studentId,
              status: "late",
              session_id: sessionId,
            })
          }
        >
          <AccessTimeIcon sx={{ mr: 1, color: "warning.main", fontSize: 20 }} />{" "}
          Đánh dấu: Đi muộn
        </MenuItem>
        <Divider sx={{ my: 1, opacity: 0.1 }} />
        <MenuItem
          onClick={() => {
            if (!sessionId || !overrideMenu) return;
            openConfirm({
              title: "Hủy điểm danh",
              message:
                "Bạn có chắc chắn muốn hủy ghi nhận điểm danh cho học sinh này?",
              onConfirm: () =>
                removeMarkMut.mutate({
                  student_id: overrideMenu.studentId,
                  session_id: sessionId,
                }),
              isPending: removeMarkMut.isPending,
            });
            setOverrideMenu(null);
          }}
          sx={{ color: "error.main" }}
        >
          <PersonOffIcon sx={{ mr: 1, fontSize: 20 }} /> Đánh dấu: Vắng mặt
        </MenuItem>
      </Menu>

      {/* QR Code Dialog for Teacher */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: "rgba(26,14,36,0.98)",
            border: "1px solid rgba(168,85,247,0.3)",
            maxWidth: 450,
            width: "100%",
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{ textAlign: "center", fontFamily: '"Cinzel", serif', pt: 3 }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              background: "linear-gradient(135deg, #c084fc, #fb7185)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            QUÉT ĐỂ ĐIỂM DANH
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", pb: 4 }}>
          {isMounted && (
            <>
              <Box
                sx={{
                  p: 3,
                  bgcolor: "#fff",
                  borderRadius: 4,
                  display: "inline-block",
                  mb: 3,
                  boxShadow: "0 0 30px rgba(168,85,247,0.3)",
                }}
              >
                <QRCodeCanvas
                  value={`${window.location.protocol}//${serverIp || window.location.hostname}:3000/teacher/remote-capture?sessionId=${sessionId || ""}&classId=${selectedClass}`}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.4)", display: "block", mt: 2 }}
              >
                *Mã QR đã được cấu hình tự động. Hãy dùng điện thoại của bạn
                quét để bắt đầu.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "center", pb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setQrDialogOpen(false)}
            sx={{ borderRadius: 10, py: 1.2, fontWeight: "bold" }}
          >
            Tôi đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaceAttendancePanel;
