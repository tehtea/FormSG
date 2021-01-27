import { NextFunction, Request, Response } from 'express'

import { WithForm, WithSubmission } from '../../../types'

import * as stripePaymentService from './stripe-payments.service'
import { isCompleteFormStripePayment } from './stripe-payments.types'

/**
 * Creates a checkout session as part of the submission process
 * @param req
 * @param res
 * @param next
 */
export const createCheckoutSession = async (
  req: WithSubmission<WithForm<Request>>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { form, submission } = req

  const { stripePayments } = form

  if (!isCompleteFormStripePayment(stripePayments)) return next()

  const { stripeAccount, lineItem } = stripePayments

  try {
    const stripeCheckoutSession = await stripePaymentService.createCheckoutSession(
      stripeAccount,
      lineItem,
      String(submission._id),
    )
    req.stripeCheckoutSession = stripeCheckoutSession
    return next()
  } catch (e) {
    console.error(e)
    res
      .status(500)
      .send({ message: 'Could not create Stripe checkout session.' })
    return
  }
}
