import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

export function formatTelefoneBR(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) {
    return `(${ddd}`;
  }

  // 10 digits => (11) 3333-4444
  if (digits.length <= 10) {
    const part1 = rest.slice(0, 4);
    const part2 = rest.slice(4, 8);
    return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
  }

  // 11 digits => (11) 93333-4444
  const part1 = rest.slice(0, 5);
  const part2 = rest.slice(5, 9);
  return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
}
