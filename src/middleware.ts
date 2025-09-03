import { NextResponse } from "next/server";

// No-op middleware to satisfy Next.js when this file exists.
// The actual middleware logic lives at the project root in middleware.ts
export default function middleware() {
  return NextResponse.next();
}
