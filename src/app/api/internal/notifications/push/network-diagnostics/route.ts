import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const TARGET_HOST = "web.push.apple.com";
const TARGET_PORT = 443;
const STAGE_TIMEOUT_MS = 8_000;

type DiagnosticResult = {
  ok: boolean;
  durationMs: number;
  errorCode?: string;
  errorClass?: string;
  [key: string]: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeToken(value: unknown, fallback: string): string {
  const normalized = normalizeText(value)
    .replace(/[^A-Za-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  return normalized || fallback;
}

function secretsMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = normalizeText(process.env.PUSH_DISPATCHER_SECRET);

  const received = normalizeText(
    request.headers.get("x-mhidas-push-dispatcher-secret")
  );

  if (!expected || !received) return false;

  return secretsMatch(received, expected);
}

function getErrorInfo(error: unknown): {
  errorCode: string;
  errorClass: string;
} {
  if (!error || typeof error !== "object") {
    return {
      errorCode: "unknown_error",
      errorClass: "UnknownError",
    };
  }

  const record = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  let code = sanitizeToken(record.code, "");

  if (!code && record.cause && typeof record.cause === "object") {
    code = sanitizeToken(
      (record.cause as { code?: unknown }).code,
      ""
    );
  }

  if (!code) {
    const message = normalizeText(record.message).toLowerCase();

    if (message.includes("timeout")) {
      code = "timeout";
    } else {
      code = "unknown_error";
    }
  }

  return {
    errorCode: code.toLowerCase(),
    errorClass: sanitizeToken(record.name, "Error"),
  };
}

async function testDns(): Promise<DiagnosticResult> {
  const startedAt = Date.now();

  try {
    const [lookupRows, ipv4Result, ipv6Result] =
      await Promise.all([
        dns.lookup(TARGET_HOST, {
          all: true,
          verbatim: true,
        }),
        dns.resolve4(TARGET_HOST).catch(() => []),
        dns.resolve6(TARGET_HOST).catch(() => []),
      ]);

    const ipv4LookupCount =
      lookupRows.filter((row) => row.family === 4).length;

    const ipv6LookupCount =
      lookupRows.filter((row) => row.family === 6).length;

    return {
      ok: lookupRows.length > 0,
      durationMs: Date.now() - startedAt,
      lookupCount: lookupRows.length,
      ipv4LookupCount,
      ipv6LookupCount,
      ipv4DnsCount: ipv4Result.length,
      ipv6DnsCount: ipv6Result.length,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      ...getErrorInfo(error),
    };
  }
}

async function testTcp(): Promise<DiagnosticResult> {
  const startedAt = Date.now();

  return await new Promise((resolve) => {
    let settled = false;

    const socket = net.createConnection({
      host: TARGET_HOST,
      port: TARGET_PORT,
    });

    const finish = (value: DiagnosticResult) => {
      if (settled) return;
      settled = true;

      clearTimeout(timer);
      socket.destroy();

      resolve(value);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        durationMs: Date.now() - startedAt,
        errorCode: "tcp_timeout",
        errorClass: "TimeoutError",
      });
    }, STAGE_TIMEOUT_MS);

    socket.once("connect", () => {
      finish({
        ok: true,
        durationMs: Date.now() - startedAt,
        remoteFamily: socket.remoteFamily || null,
      });
    });

    socket.once("error", (error) => {
      finish({
        ok: false,
        durationMs: Date.now() - startedAt,
        ...getErrorInfo(error),
      });
    });
  });
}

async function testTls(): Promise<DiagnosticResult> {
  const startedAt = Date.now();

  return await new Promise((resolve) => {
    let settled = false;

    const socket = tls.connect({
      host: TARGET_HOST,
      port: TARGET_PORT,
      servername: TARGET_HOST,
      rejectUnauthorized: true,
    });

    const finish = (value: DiagnosticResult) => {
      if (settled) return;
      settled = true;

      clearTimeout(timer);
      socket.destroy();

      resolve(value);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        durationMs: Date.now() - startedAt,
        errorCode: "tls_timeout",
        errorClass: "TimeoutError",
      });
    }, STAGE_TIMEOUT_MS);

    socket.once("secureConnect", () => {
      finish({
        ok: socket.authorized,
        durationMs: Date.now() - startedAt,
        authorized: socket.authorized,
        protocol: socket.getProtocol() || null,
        remoteFamily: socket.remoteFamily || null,
      });
    });

    socket.once("error", (error) => {
      finish({
        ok: false,
        durationMs: Date.now() - startedAt,
        ...getErrorInfo(error),
      });
    });
  });
}

async function testHttps(): Promise<DiagnosticResult> {
  const startedAt = Date.now();

  return await new Promise((resolve) => {
    let settled = false;

    const request = https.request(
      {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: "/",
        method: "HEAD",
        servername: TARGET_HOST,
        timeout: STAGE_TIMEOUT_MS,
        headers: {
          "user-agent": "MHIDAS-Push-Network-Diagnostics/1.0",
        },
      },
      (response) => {
        response.resume();

        if (settled) return;
        settled = true;

        resolve({
          ok: true,
          durationMs: Date.now() - startedAt,
          statusCode: response.statusCode ?? null,
        });
      }
    );

    request.once("timeout", () => {
      request.destroy(new Error("https_timeout"));
    });

    request.once("error", (error) => {
      if (settled) return;
      settled = true;

      resolve({
        ok: false,
        durationMs: Date.now() - startedAt,
        ...getErrorInfo(error),
      });
    });

    request.end();
  });
}

export async function POST(request: NextRequest) {
  if (!normalizeText(process.env.PUSH_DISPATCHER_SECRET)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-network-diagnostics",
        code: "dispatcher_secret_not_configured",
        sensitiveValuesReturned: false,
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "push-network-diagnostics",
        code: "unauthorized",
        sensitiveValuesReturned: false,
      },
      { status: 401 }
    );
  }

  const dnsResult = await testDns();
  const tcpResult = await testTcp();
  const tlsResult = await testTls();
  const httpsResult = await testHttps();

  return NextResponse.json(
    {
      ok:
        dnsResult.ok &&
        tcpResult.ok &&
        tlsResult.ok &&
        httpsResult.ok,
      scope: "push-network-diagnostics",
      targetHost: TARGET_HOST,
      targetPort: TARGET_PORT,
      dns: dnsResult,
      tcp: tcpResult,
      tls: tlsResult,
      https: httpsResult,
      sensitiveValuesReturned: false,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}