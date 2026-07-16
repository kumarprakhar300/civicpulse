import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function errorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  return null;
}
