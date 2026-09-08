// The regular Worker build keeps the shared API. The Pages build uses only
// bundled public data and computes routes in the browser.
export const IS_STATIC_PAGES = import.meta.env.VITE_STATIC_PAGES === "true";
export const APP_BASE = import.meta.env.BASE_URL || "/";

export function assetUrl(path: string): string {
  return APP_BASE + path.replace(/^\/+/, "");
}
