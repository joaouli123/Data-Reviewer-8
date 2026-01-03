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
  method: string,
  url: string,
  data?: any
): Promise<any> {
  const token = localStorage.getItem("auth")
    ? JSON.parse(localStorage.getItem("auth") || "{}").token
    : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (response.status === 401) {
    localStorage.removeItem("auth");
    window.location.href = "/login";
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } else {
        // Se não for JSON, logar o texto para debug mas não tentar parsear como JSON
        const text = await response.text();
        console.error("Non-JSON error response:", text.substring(0, 100));
      }
    } catch (e) {
      console.error("Error parsing error response:", e);
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export const fetcher = async (url: string) => {
  return apiRequest("GET", url);
};
