import stripe from "stripe";
import Booking from "../models/Booking.js";

// API to handle Stripe Webhooks
// POST /api/stripe
export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const session = await stripeInstance.checkout.sessions.list({
      payment_intent: paymentIntent.id,
    });
    const { bookingId } = session.data[0].metadata;
    await Booking.findByIdAndUpdate(bookingId, { isPaid: true, paymentMethod: "Stripe" });
  } else {
    console.log("Unhandled event type:", event.type);
  }

  response.json({ received: true });
};
