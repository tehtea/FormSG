import Stripe from 'stripe'

import stripe from '../../../config/stripe'

type LineItem = {
  name: string
  amount: number
}

/**
 * Creates a checkout session for a single line item in Singapore dollars, for card payments only.
 * @param stripeAccount Account to pay to
 * @param lineItem The name and amount
 */
export const createCheckoutSession = (
  stripeAccount: string,
  lineItem: LineItem,
): Promise<Stripe.Response<Stripe.Checkout.Session>> => {
  return stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: [
        {
          name: lineItem.name,
          amount: lineItem.amount,
          currency: 'sgd',
          quantity: 1,
        },
      ],
      //TODO
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    },
    {
      stripeAccount,
    },
  )
}
