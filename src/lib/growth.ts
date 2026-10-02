/** Launch growth flags — flip when ready to monetize hard */
export const GROWTH = {
  /** Sparks dating free until founder turns this off */
  sparksFree: true,
  /** Legends still paid unless coupon */
  legendsFree: false,
  /** Premium circle still paid */
  premiumFree: false,
  /** Show Sparks on Explore as secondary, never home hero */
  sparksSecondaryOnly: true,
} as const
