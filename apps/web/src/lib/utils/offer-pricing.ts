// Promotion discount calculation.
// Rule: highest absolute € discount wins, non-cumulable.
// Tiebreak: promotion with most recent valid_from wins.

export type DiscountType = 'percent' | 'fixed'

export interface PromotionServicePricing {
  promotionId: string
  promotionTitle: string
  discount_type: DiscountType
  discount_value: number
  valid_from: string
}

export interface PricingResult {
  discountedPrice: number
  appliedPromotionId: string | null
  savingAmount: number
}

export function applyBestPromotion(basePrice: number, items: PromotionServicePricing[]): PricingResult {
  if (!items || items.length === 0) {
    return { discountedPrice: basePrice, appliedPromotionId: null, savingAmount: 0 }
  }

  let best: PromotionServicePricing | null = null
  let bestSaving = 0

  for (const item of items) {
    const saving =
      item.discount_type === 'percent'
        ? (basePrice * item.discount_value) / 100
        : item.discount_value

    const isBetter =
      saving > bestSaving ||
      (saving === bestSaving && best != null && item.valid_from > best.valid_from)

    if (isBetter) {
      bestSaving = saving
      best = item
    }
  }

  const discountedPrice = Math.max(0, Number((basePrice - bestSaving).toFixed(2)))
  return {
    discountedPrice,
    appliedPromotionId: best?.promotionId ?? null,
    savingAmount: Number(bestSaving.toFixed(2)),
  }
}

export function formatDiscount(item: PromotionServicePricing): string {
  if (item.discount_type === 'percent') return `-${item.discount_value}%`
  return `-€${item.discount_value}`
}

export function daysUntil(dateStr: string): number {
  const now = new Date()
  const end = new Date(dateStr)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function formatExpiryLabel(validUntil: string | null): string {
  if (!validUntil) return 'Nessuna scadenza'
  const days = daysUntil(validUntil)
  if (days === 0) return 'Scade oggi'
  if (days === 1) return 'Scade domani'
  if (days <= 7) return `Scade tra ${days} giorni`
  return `Fino al ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(validUntil))}`
}
