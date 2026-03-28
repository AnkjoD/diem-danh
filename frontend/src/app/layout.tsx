import { Inter, Playfair_Display } from "next/font/google";
import QueryClientProvider from "@/providers/query-client-provider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  title: "Homura App",
  description: "Vòng lặp thời gian",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`}>
      <body style={{ margin: 0, padding: 0, boxSizing: "border-box" }}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <QueryClientProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryClientProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
