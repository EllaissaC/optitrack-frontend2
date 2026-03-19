import { QueryClient, QueryFunction, QueryCache } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      try {
        const body = await res.clone().json();
        if (body?.reason === "SESSION_EXPIRED") {
          sessionStorage.setItem("sessionExpired", "1");
        }
      } catch {}
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // If any data query gets a 401, treat it as session expiry:
      // clear the auth cache so AppShell redirects to login gracefully
      // instead of leaving the user on a broken/blank page.
      if (error instanceof Error && error.message.startsWith("401:")) {
        const key = query.queryKey[0];
        // Don't loop on the auth query itself — it already uses returnNull
        if (key !== "/api/auth/me" && key !== "/api/auth/setup-required") {
          queryClient.setQueryData(["/api/auth/me"], null);
        }
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
