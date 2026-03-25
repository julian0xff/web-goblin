import { analyzeSite } from "@/lib/site-analysis";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return Response.json(
        { error: "Drop in a URL first." },
        { status: 400 }
      );
    }

    const cached = getCached(url);
    if (cached) {
      return Response.json(cached, {
        headers: { "x-cache-status": "hit" },
      });
    }

    const analysis = await analyzeSite(url);
    setCache(url, analysis);

    return Response.json(analysis, {
      headers: { "x-cache-status": "miss" },
    });
  } catch (caughtError) {
    return Response.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "The goblin could not inspect that site.",
      },
      { status: 500 }
    );
  }
}
