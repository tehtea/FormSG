import { RequestHandler } from 'express'

import { WithForm } from '../../../types'

import * as stripePaymentService from './stripe-payments.service'
import { isCompleteFormStripePayment } from './stripe-payments.types'

/**
 * Creates a checkout session as part of the submission process
 * @param req
 * @param res
 * @param next
 */
export const createCheckoutSession: RequestHandler = async (
  req,
  res,
  next,
): Promise<void> => {
  const form = (req as WithForm<typeof req>).form
  const { stripePayments } = form

  if (!isCompleteFormStripePayment(stripePayments)) return next()

  const { stripeAccount, lineItem } = stripePayments

  try {
    const checkoutSession = await stripePaymentService.createCheckoutSession(
      stripeAccount,
      lineItem,
    )
    console.log('checkoutSession', checkoutSession) // TODO - save in DB

    return next()
  } catch (e) {
    console.error(e)
    res
      .status(500)
      .send({ message: 'Could not create Stripe checkout session.' })
    return
  }
}
