"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCourse } from "@/api/course";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateCourseDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const [courseName, setCourseName] = useState("");
  const [term, setTerm] = useState("");
  const [courseType, setCourseType] = useState("BOTH");

  const mutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      onClose();
      setCourseName("");
      setTerm("");
      setCourseType("BOTH");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      course_name: courseName,
      term: term,
      course_type: courseType,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
          Thêm Lớp Học Mới
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tên môn học"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Học kỳ (VD: HK1_2026)"
                required
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl component="fieldset">
                <FormLabel
                  component="legend"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Loại lớp học
                </FormLabel>
                <RadioGroup
                  row
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                >
                  <FormControlLabel
                    value="BOTH"
                    control={<Radio />}
                    label="Lý thuyết & Thực hành"
                  />
                  <FormControlLabel
                    value="THEORY"
                    control={<Radio />}
                    label="Chỉ Lý thuyết"
                  />
                  <FormControlLabel
                    value="PRACTICE"
                    control={<Radio />}
                    label="Chỉ Thực hành"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Tạo Lớp"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
