import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    ...options,
  });

  if (res.status === 401) {
    // session expired → redirect to sign-in
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let errorPayload;
    try {
      errorPayload = await res.json();
    } catch {
      errorPayload = { message: `Request failed with status ${res.status}` };
    }
    const error = new Error(
      errorPayload.message || "An error occurred while fetching the data.",
    );
    Object.assign(error, { info: errorPayload, status: res.status });
    throw error;
  }

  return res.json();
};

export function errorToString(error: unknown) {
  if (error == null) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}
