/* eslint-disable @typescript-eslint/no-explicit-any */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCookieValue = (cookieString:any, name:any) => {
  return cookieString
    ?.split('; ')
    .find((row:any) => row.startsWith(name + '='))
    ?.split('=')[1];
};
