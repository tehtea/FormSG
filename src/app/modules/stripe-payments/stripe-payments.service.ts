/* eslint-disable typesafe/no-await-without-trycatch */
import mongoose from 'mongoose'

import { IStripeCheckoutSessionSchema } from 'src/types/stripe_payments'

import stripe from '../../../config/stripe'
import getStripeCheckoutSessionModel from '../../models/stripe_checkout_session.model'
import { getEncryptSubmissionModel } from '../../models/submission.server.model'

import { LineItem, StripeAccountId } from './stripe-payments.types'

const EncryptSubmission = getEncryptSubmissionModel(mongoose)
const StripeCheckoutSession = getStripeCheckoutSessionModel(mongoose)

enum PaymentTypesAllowed {
  card = 'card',
  grabpay = 'grabpay',
}

/**
 * Creates a checkout session for a single line item in Singapore dollars, for card payments only.
 * @param stripeAccount Account to pay to
 * @param lineItem The name and amount
 */
export const createCheckoutSession = async (
  stripeAccount: StripeAccountId,
  lineItem: LineItem,
  submissionId: string,
): Promise<IStripeCheckoutSessionSchema> => {
  if (lineItem.amount < 50)
    throw new Error('Stripe only accepts amounts of at least S$0.50')

  const checkoutSessionDTO = await stripe.checkout.sessions.create(
    {
      payment_method_types: Object.values(PaymentTypesAllowed),
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
  const checkoutSession = await StripeCheckoutSession.create(checkoutSessionDTO)
  await EncryptSubmission.findOneAndUpdate(
    { _id: submissionId },
    { stripeCheckoutSessionId: checkoutSession._id },
  )
  return checkoutSession
}
