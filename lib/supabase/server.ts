import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

type CookieItem = { name: string; value: string };

function parseCookieHeader(cookieHeader: string): CookieItem[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((kv) => {
      const eq = kv.indexOf("=");
      if (eq === -1) return { name: kv, value: "" };
      return { name: kv.slice(0, eq).trim(), value: kv.slice(eq + 1).trim() };
    });
}

export async function createClient() {
  // Next 16: these dynamic APIs are async
  const cookieStore: any = await cookies();
  const headerStore: any = await headers();

  const getAllCookies = (): CookieItem[] => {
    if (cookieStore && typeof cookieStore.getAll === "function") {
      const list = cookieStore.getAll();
      return (list ?? []).map((c: any) => ({ name: c.name, value: c.value }));
    }

    // fallback: parse Cookie header
    const cookieHeader =
      (headerStore && typeof headerStore.get === "function"
        ? headerStore.get("cookie")
        : "") ?? "";

    return parseCookieHeader(cookieHeader);
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getAllCookies();
        },
        setAll(cookiesToSet) {
          // In Server Components this may not be writable; keep safe.
          try {
            if (cookieStore && typeof cookieStore.set === "function") {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            }
          } catch {
            // ignore
          }
        },
      },
    }
  );
}