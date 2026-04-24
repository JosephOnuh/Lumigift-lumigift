import { NextRequest, NextResponse } from "next/server";

// Matches /api/* but NOT /api/v1/* and NOT /api/auth/[...nextauth]
const UNVERSIONED_API = /^\/api\/(?!v\d+\/)(.+)$/;

export function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(UNVERSIONED_API);
  if (!match) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/api/v1/${match[1]}`;

  const res = NextResponse.redirect(url, { status: 308 }); // 308 Permanent Redirect preserves method
  res.headers.set("Deprecation", "true");
  res.headers.set("Link", `<${url.pathname}>; rel="successor-version"`);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
