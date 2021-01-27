import { Document, Model } from 'mongoose'
import { Stripe } from 'stripe'

/**
 * An example reply from the Stripe API that conforms to the
 * Stripe.Checkout.Session type.
 *
 * @example CheckoutSession {
 *  id: 'cs_test_a1dFF3IAQwuIbjy8utVLFAanlGLm2CTSjRYGqNHLafVImXGtqtuoraebSm',
 *  object: 'checkout.session',
 *  allow_promotion_codes: null,
 *  amount_subtotal: 50,
 *  amount_total: 50,
 *  billing_address_collection: null,
 *  cancel_url: 'https://example.com/cancel',
 *  client_reference_id: null,
 *  currency: 'sgd',
 *  customer: null,
 *  customer_details: null,
 *  customer_email: null,
 *  livemode: false,
 *  locale: null,
 *  metadata: {},
 *  mode: 'payment',
 *  payment_intent: 'pi_1IDQMhD3kn1Qqb3vZJAEhFiU',
 *  payment_method_types: [ 'card', 'grabpay' ],
 *  payment_status: 'unpaid',
 *  setup_intent: null,
 *  shipping: null,
 *  shipping_address_collection: null,
 *  submit_type: null,
 *  subscription: null,
 *  success_url: 'https://example.com/success',
 *  total_details: { amount_discount: 0, amount_tax: 0 }
 * }
 */

export interface IStripeSessionTotalDetails
  extends Document,
    Stripe.Checkout.Session.TotalDetails {}
// Define the schema directly on top of Stripe's types
// TODO: Add instance methods
export interface IStripeCheckoutSessionSchema
  extends Document,
    Omit<Stripe.Checkout.Session, 'id'> {}
// Omitting `id` because of interface clash with the virtual getter defined on Document.
// This is a hack, because we need to save the checkout session ID into the `id` field in the schema
// and this can be accomplished by setting `id: false` in the SchemaOptions

// TODO: Convert to interface and extend to add static methods
export type IStripeCheckoutSessionModel = Model<IStripeCheckoutSessionSchema>
