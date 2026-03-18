import { TextField, TextFieldProps } from "@mui/material";
import { forwardRef } from "react";

const HomuraInput = forwardRef<HTMLInputElement, TextFieldProps>(
  (props, ref) => {
    return (
      <TextField
        inputRef={ref}
        fullWidth
        variant="outlined"
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
            "& fieldset": {
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: "1px",
            },
            "&:hover fieldset": {
              borderColor: "rgba(225, 190, 231, 0.5)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#7B1FA2",
              borderWidth: "2px",
            },
            "&.Mui-focused": {
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              boxShadow: "0 0 15px rgba(123, 31, 162, 0.2)",
            },
          },
          "& .MuiInputLabel-root": {
            color: "rgba(255, 255, 255, 0.5)",
          },
        }}
        {...props}
      />
    );
  },
);

HomuraInput.displayName = "HomuraInput";
export default HomuraInput;
