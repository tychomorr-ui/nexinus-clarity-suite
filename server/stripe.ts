import Stripe from "stripe";
import { getProduct, XINUS_PLUS } from "./products";
import type { ProductKey } from "../drizzle/schema";

const cachedPriceIds = new Map<string, string>();

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("XinUS billing is not configured.");
  return new Stripe(secret);
}

export async function ensureProductPrice(productKey: ProductKey, stripe = getStripe()) {
  const cached = cachedPriceIds.get(productKey);
  if (cached) return cached;
  const productDefinition = getProduct(productKey);
  if (productDefinition.billingModel === "free" || !productDefinition.amountUsdCents || !productDefinition.interval) throw new Error(`${productDefinition.name} does not require a paid Stripe price.`);
  const products = await stripe.products.search({ query: `metadata['xinus_product_key']:'${productKey}'`, limit: 1 });
  const product = products.data[0] ?? await stripe.products.create({
    name: productDefinition.name,
    description: productDefinition.description,
    metadata: { xinus_product_key: productKey, payer_model: productDefinition.billingModel },
  });
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
  const price = prices.data.find(candidate => candidate.unit_amount === productDefinition.amountUsdCents && candidate.currency === "usd" && candidate.recurring?.interval === productDefinition.interval)
    ?? await stripe.prices.create({ product: product.id, unit_amount: productDefinition.amountUsdCents, currency: "usd", recurring: { interval: productDefinition.interval }, metadata: { xinus_product_key: productKey } });
  cachedPriceIds.set(productKey, price.id);
  return price.id;
}

export async function ensureXinUSPlusPrice(stripe = getStripe()) {
  const cached = cachedPriceIds.get(XINUS_PLUS.key);
  if (cached) return cached;
  const products = await stripe.products.search({ query: `metadata['xinus_key']:'${XINUS_PLUS.key}'`, limit: 1 });
  const product = products.data[0] ?? await stripe.products.create({ name: XINUS_PLUS.name, description: XINUS_PLUS.description, metadata: { xinus_key: XINUS_PLUS.key } });
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
  const price = prices.data.find(candidate => candidate.unit_amount === XINUS_PLUS.amountUsdCents && candidate.currency === "usd" && candidate.recurring?.interval === XINUS_PLUS.interval)
    ?? await stripe.prices.create({ product: product.id, unit_amount: XINUS_PLUS.amountUsdCents, currency: "usd", recurring: { interval: XINUS_PLUS.interval }, metadata: { xinus_key: XINUS_PLUS.key } });
  cachedPriceIds.set(XINUS_PLUS.key, price.id);
  return price.id;
}
