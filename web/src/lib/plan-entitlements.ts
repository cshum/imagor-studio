export interface PlanEntitlements {
  maxSpaces: number
  storageLimitGB: number
  transformsLimit: number
}

const PLAN_FREE = 'free'

const planEntitlements: Record<string, PlanEntitlements> = {
  [PLAN_FREE]: {
    maxSpaces: 0,
    storageLimitGB: 0,
    transformsLimit: 0,
  },
  trial: {
    maxSpaces: 1,
    storageLimitGB: 1,
    transformsLimit: 1000,
  },
  early_bird: {
    maxSpaces: 3,
    storageLimitGB: 10,
    transformsLimit: 10000,
  },
  starter: {
    maxSpaces: 1,
    storageLimitGB: 20,
    transformsLimit: 25000,
  },
  pro: {
    maxSpaces: 3,
    storageLimitGB: 100,
    transformsLimit: 150000,
  },
  team: {
    maxSpaces: 10,
    storageLimitGB: 500,
    transformsLimit: 750000,
  },
  enterprise: {
    maxSpaces: -1,
    storageLimitGB: -1,
    transformsLimit: -1,
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
