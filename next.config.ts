import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages:["pdfjs-dist","tesseract.js","@tesseract.js-data/nor","@napi-rs/canvas"],
  outputFileTracingIncludes:{"/api/matches/report":["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs","./node_modules/@tesseract.js-data/nor/4.0.0/*.gz"]}
};

export default nextConfig;

