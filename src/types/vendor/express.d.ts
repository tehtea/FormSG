import { IUserSchema } from 'src/types'

import { IStripeCheckoutSessionSchema } from '../stripe_payments'

declare global {
  namespace Express {
    export interface Request {
      id?: string
      stripeCheckoutSession?: IStripeCheckoutSessionSchema
    }

    export interface Session {
      user?: IUserSchema
    }

    export interface AuthedSession extends Session {
      user: IUserSchema
    }
  }
}
