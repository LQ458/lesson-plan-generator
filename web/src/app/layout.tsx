import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/lib/settings-context";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { AuthDebug } from "@/components/auth-debug";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TeachAI - 智能教案生成器",
  description:
    "基于AI的智能教案和练习题生成工具，帮助教师快速创建高质量的教学内容",
  keywords: ["教案生成", "AI教育", "智能教学", "练习题生成", "教师工具"],
  authors: [{ name: "TeachAI Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider>
            <SettingsProvider>
              <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
                <Navbar />
                <main className="pb-16 md:pb-0">{children}</main>
                <AuthDebug />
              </div>
            </SettingsProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}