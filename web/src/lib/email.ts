import { z } from 'zod'

const emailSchema = z.email()

export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value.trim()).success
}

export function normalizeEmail(value: string): string {
  return value.trim()
}
