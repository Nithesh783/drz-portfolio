import { NextResponse, type NextRequest } from "next/server";
import { adminDashboardHref } from "@/lib/admin-tabs";

type RouteContext = {
  params: Promise<{ action: string }>;
};

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();

  return (
    request.nextUrl.protocol === "https:" || forwardedProtocol === "https"
  );
}

type LoginErrorCode = "invalid_credentials" | "invalid_request" | "unavailable";

function redirectLogin(error?: LoginErrorCode): NextResponse {
  const destination = error
    ? `/admin/login/?error=${encodeURIComponent(error)}`
    : adminDashboardHref;
  return new NextResponse(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      Location: destination,
    },
  });
}

function appendSetCookies(
  response: NextResponse,
  upstreamResponse: Response,
  request: NextRequest,
): void {
  for (const cookie of upstreamResponse.headers.getSetCookie()) {
    response.headers.append(
      "Set-Cookie",
      isSecureRequest(request) ? cookie : cookie.replace(/;\s*secure(?=;|$)/i, ""),
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { action } = await params;
  if (action !== "login" && action !== "logout") {
    return NextResponse.json(
      { message: "Admin authentication route was not found." },
      { status: 404 },
    );
  }

  const isFormSubmission =
    action === "login" &&
    (request.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith("application/x-www-form-urlencoded");

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(
      `/admin/auth/${action}`,
      process.env.API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:4000",
    );
  } catch (error) {
    console.error("Invalid backend API URL configuration.", error);
    if (isFormSubmission) return redirectLogin("unavailable");
    return NextResponse.json(
      { message: "Backend API is misconfigured." },
      { status: 500 },
    );
  }

  let upstreamResponse: Response;
  try {
    let requestBody: BodyInit | undefined;
    let requestContentType: string | undefined;

    if (action === "login") {
      if (isFormSubmission) {
        const values = await request.formData();
        const email = values.get("email");
        const password = values.get("password");
        requestBody = JSON.stringify({
          email: typeof email === "string" ? email.trim() : "",
          password: typeof password === "string" ? password : "",
        });
        requestContentType = "application/json";
      } else {
        requestBody = await request.arrayBuffer();
        requestContentType =
          request.headers.get("content-type") ?? "application/json";
      }
    }

    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      ...(requestBody !== undefined
        ? {
            headers: {
              "Content-Type": requestContentType ?? "application/json",
            },
            body: requestBody,
          }
        : {}),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Admin authentication request failed.", error);
    if (isFormSubmission) return redirectLogin("unavailable");
    return NextResponse.json(
      { message: "Admin authentication service is unavailable." },
      { status: 502 },
    );
  }

  if (isFormSubmission) {
    if (!upstreamResponse.ok) {
      const error: LoginErrorCode =
        upstreamResponse.status === 401
          ? "invalid_credentials"
          : upstreamResponse.status === 400
            ? "invalid_request"
            : "unavailable";
      return redirectLogin(error);
    }

    const response = redirectLogin();
    appendSetCookies(response, upstreamResponse, request);
    return response;
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstreamResponse.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
  appendSetCookies(response, upstreamResponse, request);

  return response;
}
