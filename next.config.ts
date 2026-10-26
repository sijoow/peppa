import path from "path";
import type { NextConfig } from "next";

/**
 * 진도·기록은 MongoDB 에 둔다(app/api/progress) — 그래서 서버가 있는 Next 로 돌린다.
 * APK 는 보이스동화처럼 Vercel 에 올린 사이트를 TWA 로 감싼다. 기기에도 사본을 둬서 잠깐 끊겨도 아이는 계속 논다.
 */

// 그림은 회사 Cafe24 호스팅(npm run image:upload)에 있다 — "/cdn/…" 을 그쪽으로 이어 준다(lib/assets).
// 같은 사이트 주소로 보이니 캔버스(색칠·스티커 저장)도 막히지 않는다. 주소가 없으면 public/ 사본을 쓴다.
const CDN =
  process.env.CAFE24_PUBLIC_BASE_URL && process.env.CAFE24_UPLOAD_DIR
    ? new URL(process.env.CAFE24_UPLOAD_DIR.replace(/^\/+/, "").replace(/\/?$/, "/"), process.env.CAFE24_PUBLIC_BASE_URL).href
    : "";

const nextConfig: NextConfig = {
  // 그림은 미리 줄여서(webp) 올린다 — 서버에서 다시 줄일 일이 없다
  images: { unoptimized: true },
  env: { IMG_BASE: CDN },
  async rewrites() {
    return CDN ? [{ source: "/cdn/:path*", destination: `${CDN}:path*` }] : [];
  },
  // 홈 디렉터리에 떠도는 package-lock.json 때문에 워크스페이스 루트를
  // 잘못 추론하는 것을 막는다 (dev 서버 기동 시 경고 원인).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
