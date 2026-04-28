export interface PlanEntitlements {
  maxSpaces: number
  storageLimitGB: number
  transformsLimit: number
  maxCustomDomains: number
}

const PLAN_FREE = 'free'

const planEntitlements: Record<string, PlanEntitlements> = {
  [PLAN_FREE]: {
    maxSpaces: 0,
    storageLimitGB: 0,
    transformsLimit: 0,
    maxCustomDomains: 0,
  },
  // Trial is an intentional cloud onboarding lifecycle state.
  trial: {
    maxSpaces: 1,
    storageLimitGB: 1,
    transformsLimit: 1000,
    maxCustomDomains: 0,
  },
  starter: {
    maxSpaces: 1,
    storageLimitGB: 20,
    transformsLimit: 25000,
    maxCustomDomains: 0,
  },
  pro: {
    maxSpaces: 3,
    storageLimitGB: 100,
    transformsLimit: 150000,
    maxCustomDomains: 3,
  },
  team: {
    maxSpaces: 20,
    storageLimitGB: 1000,
    transformsLimit: 1500000,
    maxCustomDomains: 25,
  },
}

export function getPlanEntitlements(plan: string | null | undefined): PlanEntitlements {
  if (!plan) {
    return planEntitlements[PLAN_FREE]
  }
  return planEntitlements[plan] ?? planEntitlements[PLAN_FREE]
}

export function isUnlimitedLimit(value: number): boolean {
  return value < 0
}
