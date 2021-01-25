import Stripe from 'stripe'

import stripe from '../../../config/stripe'

import { LineItem, StripeAccountId } from './stripe-payments.types'

/**
 * Creates a checkout session for a single line item in Singapore dollars, for card payments only.
 * @param stripeAccount Account to pay to
 * @param lineItem The name and amount
 */
export const createCheckoutSession = async (
  stripeAccount: StripeAccountId,
  lineItem: LineItem,
): Promise<Stripe.Response<Stripe.Checkout.Session>> => {
  if (lineItem.amount < 50)
    throw new Error('Stripe only accepts amounts of at least S$0.50')
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
      //TODO - create correct redirect URLs
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    },
    {
      stripeAccount,
    },
  )
}
