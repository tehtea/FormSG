import Stripe from 'stripe'

import { payments } from './config'

const { stripeSecretKey } = payments

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2020-08-27',
})

export = stripe
