export type LineItem = {
  name: string
  amount: number
}
export type StripeAccountId = `acct_${string}`

export type CompleteFormStripePayment = {
  stripeAccount: StripeAccountId
  lineItem: LineItem
}

export function isLineItem(lineItem: any): lineItem is LineItem {
  return Boolean(
    typeof lineItem === 'object' &&
      typeof lineItem.name === 'string' &&
      typeof lineItem.amount === 'number',
  )
}

export function isStripeAccount(
  stripeAccount: any,
): stripeAccount is StripeAccountId {
  return typeof stripeAccount === 'string' && stripeAccount.startsWith('acct_')
}

export function isCompleteFormStripePayment(
  stripePayments: any,
): stripePayments is CompleteFormStripePayment {
  return (
    typeof stripePayments === 'object' &&
    isLineItem(stripePayments.lineItem) &&
    isStripeAccount(stripePayments.stripeAccount)
  )
}
