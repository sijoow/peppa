/**
 * /.well-known/assetlinks.json — 안드로이드 앱(TWA)이 이 사이트를 주소창 없이 띄우게 하는 확인 파일.
 * 시험판(2026-10-26, 이 PC 에서 Bubblewrap 으로 만든 시험 서명 키) 값. 지문은 비밀이 아니다(그대로 공개되는 값).
 * 플레이에 올릴 때는 플레이 앱 서명 키 지문으로 바꾼다.
 */
export const dynamic = "force-static";

const PACKAGE = "kr.haon.hangulnara";
const FINGERPRINT = "7D:D9:19:0E:A5:F1:43:E2:95:49:46:82:FD:3D:65:B1:C9:28:EB:1E:E7:91:34:3C:4D:DA:72:70:42:D2:F7:15";

export function GET() {
  return Response.json(
    [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: PACKAGE, sha256_cert_fingerprints: [FINGERPRINT] } }],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
