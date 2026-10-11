import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Flint presenter session (docs/PLAN.md §1.3 item 13). A signed, httpOnly cookie that is
 * independent of the Supabase session, so switching persona never logs the presenter out.
 */
const COOKIE = "flint_presenter";
const TTL_SECONDS = 60 * 60 * 12;

function secret(): string {
  const s = process.env.DEMO_CONSOLE_SECRET;
  if (!s || s.length < 32) throw new Error("DEMO_CONSOLE_SECRET must be at least 32 characters.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function checkPresenterPassword(candidate: string): boolean {
  const expected = process.env.DEMO_PRESENTER_PASSWORD ?? "";
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function startPresenterSession() {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `presenter.${expires}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function endPresenterSession() {
  (await cookies()).delete(COOKIE);
}

export async function isPresenter(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const i = value.lastIndexOf(".");
  const payload = value.slice(0, i);
  const sig = Buffer.from(value.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return false;
  return Number(payload.split(".")[1]) > Date.now() / 1000;
}

/** Guard for every console server action. */
export async function verifyPresenter() {
  if (!(await isPresenter())) throw new Error("Presenter session required.");
}
