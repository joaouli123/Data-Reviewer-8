import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Sem cache - sempre fresh
      gcTime: 0, // Garbage collect imediatamente
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: false,
    },
  },
});

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem("auth")
    ? JSON.parse(localStorage.getItem("auth") || "{}").token
    : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("auth");
    window.location.href = "/login";
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const fetcher = async (url: string) => {
  return apiRequest(url);
};
