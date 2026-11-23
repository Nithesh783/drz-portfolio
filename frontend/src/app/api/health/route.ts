import { NextResponse } from "next/server";

type BackendHealth = {
  status: "ok";
  service: "portfolio-api";
};

function isBackendHealth(value: unknown): value is BackendHealth {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "ok" &&
    "service" in value &&
    value.service === "portfolio-api"
  );
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  let healthUrl: URL;
  try {
    healthUrl = new URL(
      "/health",
      process.env.API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:4000",
    );
  } catch (error) {
    console.error("Invalid backend API URL configuration.", error);
    return NextResponse.json(
      { status: "error", message: "Backend API URL is misconfigured." },
      { status: 500 },
    );
  }

  let response: Response;
  try {
    response = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Backend health request failed.", error);
    return NextResponse.json(
      { status: "error", message: "Backend API is unavailable." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    console.error(`Backend health request returned HTTP ${response.status}.`);
    return NextResponse.json(
      { status: "error", message: "Backend health check failed." },
      { status: 502 },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    console.error("Backend health response was not valid JSON.", error);
    return NextResponse.json(
      { status: "error", message: "Backend returned an invalid health response." },
      { status: 502 },
    );
  }

  if (!isBackendHealth(payload)) {
    console.error("Backend health response did not match the expected format.");
    return NextResponse.json(
      { status: "error", message: "Backend returned an invalid health response." },
      { status: 502 },
    );
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
