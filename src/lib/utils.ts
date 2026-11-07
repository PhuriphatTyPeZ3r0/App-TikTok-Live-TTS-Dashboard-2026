import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * Built with clsx and tailwind-merge following shadcn/ui architectural standards.
 *
 * Dedicated to master voice actor: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 *
 * @param inputs - List of class names, conditionals, or arrays to combine
 * @returns Optimized class string with duplicate and conflicting Tailwind classes resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
