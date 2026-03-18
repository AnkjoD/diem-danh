import { Button, ButtonProps } from "@mui/material";

export default function HomuraButton({ children, ...props }: ButtonProps) {
  return (
    <Button
      variant="contained"
      fullWidth
      disableElevation
      sx={{
        py: 1.8,
        mt: 1,
        mb: 3,
        textTransform: "none",
        fontSize: "1.05rem",
        borderRadius: "12px",
        transition: "all 0.3s ease",
        background:
          props.color === "secondary"
            ? "linear-gradient(45deg, #8A0303 30%, #D32F2F 90%)"
            : "linear-gradient(45deg, #4A148C 30%, #7B1FA2 90%)",
        boxShadow:
          props.color === "secondary"
            ? "0 4px 20px rgba(138, 3, 3, 0.4)"
            : "0 4px 20px rgba(123, 31, 162, 0.4)",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            props.color === "secondary"
              ? "0 6px 25px rgba(138, 3, 3, 0.6)"
              : "0 6px 25px rgba(123, 31, 162, 0.6)",
        },
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
