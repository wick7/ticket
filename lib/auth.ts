import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me"
);

export async function createToken() {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}
