import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
// 프리텐다드(app/fonts) — 글자 조각별 파일, 화면에 나온 글자만 내려받는다
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "하온이의 한글나라",
  description: "우리 아이 한글 모험 — 토도한글 커리큘럼을 따라가는 집에서 쓰는 한글 놀이",
  appleWebApp: { capable: true, title: "한글나라", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 아이가 두 손가락으로 화면을 키우다 길을 잃지 않게
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fff7ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
