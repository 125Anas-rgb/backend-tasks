const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const prisma = require("../config/db");

const handleStripeWebhook = async (req, res) => {

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // First: verify the signature and return event
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            webhookSecret
        )
    }
    catch (error) {
        console.error("Webhook signature verification failed:", error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Second: process the verified event.
    try {
        //identifies what happened
        switch (event.type) {
            case "checkout.session.completed": {
                //contains session,subscription or invoice involved
                const session = event.data.object;
                // Only process subscription Checkout Sessions.
                if (session.mode !== 'subscription' || !session.subscription) {
                    break;
                }

                //Getting subscription details
                const subscription = await stripe.subscriptions.retrieve(
                    session.subscription
                )

                //grant access only to these subscritpiton
                if (!['active', 'trailing'].includes(subscription.status)) {
                    break;
                }


                // Find our user using the Stripe customer ID saved in checkout session.
                const user = await prisma.user.findUnique({
                    where: {
                        stripeCustomerId: session.customer,
                    },
                });

                if (!user) {
                    throw new Error("No user found for this Stripe customer");
                }

                const item = subscription.items.data[0];
                const periodEnd = item?.current_period_end ?? subscription.current_period_end

                if (!periodEnd) {
                    throw new Error("Subscription billing period is missing");
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        tier: "PRO",
                        stripeSubscriptionId: subscription.id,
                        stripePriceId: item.price.id,
                        stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
                    },
                });

                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object;

                // Match the subscription being deleted.
                await prisma.user.updateMany({
                    where: {
                        stripeSubscriptionId: subscription.id,
                    },
                    data: {
                        tier: "FREE",
                        stripeSubscriptionId: null,
                        stripePriceId: null,
                        stripeCurrentPeriodEnd: null,
                    },
                });

                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                console.error("Subscription payment failed:", {
                    invoiceId: invoice.id,
                    customerId: invoice.customer,
                });

                // Optional: send a warning email here.
                break;
            }

            default:
                break;

        }
    }
    catch (error) {
        console.error("Webhook processing failed:", error);

        return res.status(500).json({
            error: "Failed to process webhook",
        });
    }
};

module.exports = handleStripeWebhook;