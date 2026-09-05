import type { NextConfig } from "next";

/**
 * Host tambahan yang boleh meminta dev resource Next.js (`/_next/*`, `/_next/hmr`).
 * Default Next hanya mengizinkan `localhost` dan hostname bind server, sehingga akses
 * lewat Tailscale/tunnel akan dijawab 403 dan bundel JS gagal dimuat.
 *
 * Isi lewat `NEXT_DEV_ALLOWED_ORIGINS` di `.env` (dipisah koma), bukan hardcode,
 * karena IP dan hostname tunnel berbeda tiap mesin. Hanya berpengaruh di `next dev`.
 */
const devOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
};

export default nextConfig;
