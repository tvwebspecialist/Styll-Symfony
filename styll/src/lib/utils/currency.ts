export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatCurrencyShort = (amount: number): string => {
  return `€${amount.toFixed(2).replace('.', ',')}`
}

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(',', '.').replace('€', '').trim())
}

export const formatRevenue = (amount: number): string => {
  if (amount >= 1000) {
    return `€${(amount / 1000).toFixed(1)}k`
  }
  return formatCurrencyShort(amount)
}
