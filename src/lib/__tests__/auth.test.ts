import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// Must mock "server-only" before importing auth
vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn: string = "7d"
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets auth-token cookie", async () => {
    await createSession("user-1", "a@b.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("cookie options are httpOnly, sameSite lax, path /", async () => {
    await createSession("user-1", "a@b.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie is not secure in non-production environment", async () => {
    await createSession("user-1", "a@b.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("token encodes userId and email", async () => {
    await createSession("user-42", "hello@world.com");

    const token = mockCookieStore.set.mock.calls[0][1];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@world.com");
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "a@b.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expires: Date = options.expires;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });
});

describe("getSession", () => {
  test("returns null when cookie is absent", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-99", email: "x@y.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("x@y.com");
  });

  test("returns null for a malformed token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" }, "1ms");
    await new Promise((r) => setTimeout(r, 20));

    mockCookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });

  test("calls delete exactly once", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
  });
});

describe("verifySession", () => {
  test("returns null when request has no cookie", async () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(await verifySession(req)).toBeNull();
  });

  test("returns session payload for a valid token in the request", async () => {
    const token = await makeToken({ userId: "user-77", email: "req@test.com" });
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Cookie: `auth-token=${token}` },
    });

    const session = await verifySession(req);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-77");
    expect(session?.email).toBe("req@test.com");
  });

  test("returns null for an invalid token in the request", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Cookie: "auth-token=garbage" },
    });
    expect(await verifySession(req)).toBeNull();
  });

  test("returns null for an expired token in the request", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" }, "1ms");
    await new Promise((r) => setTimeout(r, 20));

    const req = new NextRequest("http://localhost/api/test", {
      headers: { Cookie: `auth-token=${token}` },
    });
    expect(await verifySession(req)).toBeNull();
  });

  test("returns null when a different cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Cookie: "session-id=abc123" },
    });
    expect(await verifySession(req)).toBeNull();
  });
});
