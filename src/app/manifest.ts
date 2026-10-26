import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** 홈 화면 앱 정보 — 주소창 없이 꽉 차게, 처음엔 세로(부모 설정에서 가로로, lib/orientation). 아이콘은 페파(public/img/app-icon*.png) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "하온이의 한글나라",
    short_name: "한글나라",
    description: "페파와 함께하는 하온이의 한글 모험",
    lang: "ko",
    start_url: "/",
    display: "fullscreen",
    orientation: "portrait",
    background_color: "#fff7ec",
    theme_color: "#fff7ec",
    icons: [
      { src: "/img/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/img/app-icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
