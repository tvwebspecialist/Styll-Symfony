// Centralized offer discount calculation.
// Rule: highest absolute € discount wins, non-cumulable.
// Tiebreak: offer with most recent starts_at wins.

export interface OfferForPricing {
  id: string
  title: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  starts_at: string
}

export interface PricingResult {
  discountedPrice: number
  appliedOffer: OfferForPricing | null
  savingAmount: number
}

export function applyBestOffer(basePrice: number, offers: OfferForPricing[]): PricingResult {
  if (!offers || offers.length === 0) {
    return { discountedPrice: basePrice, appliedOffer: null, savingAmount: 0 }
  }

  let bestOffer: OfferForPricing | null = null
  let bestSaving = 0

  for (const offer of offers) {
    const saving =
      offer.discount_type === 'percentage'
        ? (basePrice * offer.discount_value) / 100
        : offer.discount_value

    const isBetter =
      saving > bestSaving ||
      (saving === bestSaving && bestOffer != null && offer.starts_at > bestOffer.starts_at)

    if (isBetter) {
      bestSaving = saving
      bestOffer = offer
    }
  }

  const discountedPrice = Math.max(0, Number((basePrice - bestSaving).toFixed(2)))
  return { discountedPrice, appliedOffer: bestOffer, savingAmount: Number(bestSaving.toFixed(2)) }
}

export function formatDiscount(offer: OfferForPricing): string {
  if (offer.discount_type === 'percentage') {
    return `-${offer.discount_value}%`
  }
  return `-€${offer.discount_value}`
}

export function daysUntil(dateStr: string): number {
  const now = new Date()
  const end = new Date(dateStr)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function formatExpiryLabel(endsAt: string): string {
  const days = daysUntil(endsAt)
  if (days === 0) return 'Scade oggi'
  if (days === 1) return 'Scade domani'
  if (days <= 7) return `Scade tra ${days} giorni`
  return `Fino al ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(endsAt))}`
}
