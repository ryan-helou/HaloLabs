import Stripe from "stripe";
import { STRIPE } from "./env";

/**
 * Stripe client, or null when billing isn't configured (dev without keys).
 * Callers check for null and degrade gracefully.
 */
export const stripe: Stripe | null = STRIPE.secretKey
  ? new Stripe(STRIPE.secretKey)
  : null;
