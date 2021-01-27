import { Mongoose, Schema, SchemaOptions } from 'mongoose'

import {
  IStripeCheckoutSessionModel,
  IStripeCheckoutSessionSchema,
  IStripeSessionTotalDetails,
} from 'src/types/stripe_payments'

export const STRIPE_CHECKOUT_SCHEMA_ID = 'StripeCheckoutSession'

const stripeCheckoutSchemaOptions: SchemaOptions = {
  id: false,
  toJSON: { getters: true },
  read: 'nearest',
  timestamps: {
    createdAt: 'created',
    updatedAt: 'lastModified',
  },
}

const compileStripeCheckoutSessionModel = (
  db: Mongoose,
): IStripeCheckoutSessionModel => {
  const TotalDetailsSchema = new Schema<IStripeSessionTotalDetails>({
    // Sum of all the line item discounts
    amount_discount: {
      type: Number,
      required: true,
    },
    // Sum of all line item tax amounts
    amount_tax: {
      type: Number,
      required: true,
    },
    // breakdown?: TotalDetails.Breakdown
  })
  const StripeCheckoutSessionSchema = new Schema<IStripeCheckoutSessionSchema>(
    {
      id: {
        type: String,
        required: true,
      },
      object: {
        type: String,
        required: true,
      },
      allow_promotion_codes: {
        type: Boolean,
        required: false,
      },
      amount_subtotal: {
        type: Number,
        required: false,
      },
      amount_total: {
        type: Number,
        required: false,
      },
      // billing_address_collection: ?
      cancel_url: String,
      client_reference_id: {
        type: String,
        required: false,
      },
      currency: {
        // a 3-letter ISO code in lowercase
        type: String,
        required: false,
        lowercase: true,
      },
      customer: {
        // The ID of the customer for this Session.
        // For Checkout Sessions in payment or subscription mode,
        // Checkout will create a new customer object based on information
        // provided during the payment flow unless an existing customer was
        // provided when the Session was created.
        // This could be `expanded` into a Stripe.Customer or Stripe.DeletedCustomer
        // object, so the model is incomplete
        type: String,
        required: false,
      },
      // customer_details: ?
      customer_email: {
        type: String,
        required: false,
      },
      livemode: Boolean, // false if in `test mode`
      // locale: ?
      // metadata: ?
      mode: {
        // TODO: This looks like a good key to use as a discriminator
        type: String,
        enum: ['payment', 'setup', 'subscription'],
      },
      payment_intent: {
        // The ID of the PaymentIntent for CheckoutSessions in `payment` mode
        // This could be `expanded` into a Stripe.PaymentIntent object, so the model is incomplete
        type: String,
        required: false,
      },
      payment_method_types: [String],
      payment_status: {
        type: String,
        required: true,
        enum: ['no_payment_required', 'paid', 'unpaid'], // PaymentStatus
      },
      setup_intent: {
        // The ID of the SetupIntent for Checkout Sessions in `setup` mode.
        // This could be `expanded` into a Stripe.SetupIntent object, so the model is incomplete
        type: String,
        required: false,
      },
      // shipping: Session.Shipping or null
      // shipping_address_collection: Session.ShippingAddressCollection | null
      /**
       * Describes the type of transaction being performed by Checkout in order to customize
       * relevant text on the page, such as the submit button. `submit_type` can only be
       * specified on Checkout Sessions in `payment` mode, but not Checkout Sessions
       * in `subscription` or `setup` mode.
       */
      // submit_type: ?
      // The ID of the subscription for Checkout Sessions in `subscription` mode.
      subscription: {
        type: String,
        required: false,
      },
      // URL user will be directed to after payment or subscription creation is successful.
      success_url: {
        type: String,
        required: true,
      },
      // Tax and discount details for the computed total amount
      total_details: TotalDetailsSchema,
    },
    stripeCheckoutSchemaOptions,
  )
  const StripeCheckoutSessionModel = db.model<
    IStripeCheckoutSessionSchema,
    IStripeCheckoutSessionModel
  >(STRIPE_CHECKOUT_SCHEMA_ID, StripeCheckoutSessionSchema)

  return StripeCheckoutSessionModel
}

const getStripeCheckoutSessionModel = (
  db: Mongoose,
): IStripeCheckoutSessionModel => {
  try {
    return db.model(STRIPE_CHECKOUT_SCHEMA_ID) as IStripeCheckoutSessionModel
  } catch {
    return compileStripeCheckoutSessionModel(db)
  }
}
export default getStripeCheckoutSessionModel
