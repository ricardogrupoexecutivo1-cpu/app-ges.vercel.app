import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Em alguns contextos não dá pra setar cookie; não pode derrubar a página.
        }
      },
    },
  });

  return supabase;
}

function clearBrokenSbCookies() {
  const cookieStore = cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("sb-")) {
      cookieStore.set(c.name, "", { path: "/", maxAge: 0 });
    }
  }
}

export async function safeGetUser() {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch (e: any) {
    if (e?.code === "refresh_token_not_found") {
      clearBrokenSbCookies();
      return null;
    }
    throw e;
  }
}

export async function safeGetSession() {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  } catch (e: any) {
    if (e?.code === "refresh_token_not_found") {
      clearBrokenSbCookies();
      return null;
    }
    throw e;
  }
}