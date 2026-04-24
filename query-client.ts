import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

export function getApiUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return new URL(`https://${domain}`).href;
  }
  // On web (browser), use same-origin — API is served by the same server
  if (typeof globalThis !== "undefined" && (globalThis as typeof globalThis & { window?: { location?: { origin?: string } } }).window?.location?.origin) {
    return (globalThis as typeof globalThis & { window: { location: { origin: string } } }).window.location.origin;
  }
  throw new Error("EXPO_PUBLIC_DOMAIN is not set");
}

// Module-level token store so auth context can set it
let _authToken: string | null = null;
export function setAuthToken(token: string | null) {
  _authToken = token;
}
export function getAuthToken(): string | null {
  return _authToken;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (_authToken) headers["Authorization"] = `Bearer ${_authToken}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
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
    const baseUrl = getApiUrl();
    const [firstKey, ...rest] = queryKey as string[];
    const url = new URL(
      rest.length ? `${firstKey}/${rest.join("/")}` : (firstKey as string),
      baseUrl
    );

    const headers: Record<string, string> = {};
    if (_authToken) headers["Authorization"] = `Bearer ${_authToken}`;

    const res = await fetch(url.toString(), { headers });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
