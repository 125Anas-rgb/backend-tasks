const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const prisma = require("../config/db");

const handleStripeWebhook = async (req, res) => {

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;


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


    try {
        const checkoutEventTypes = [
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
        ];

        const isCheckoutEvent = checkoutEventTypes.includes(event.type);

        const session = isCheckoutEvent ? event.data.object : null;

        const checkoutSubscription =
            session?.mode === "subscription" && session.subscription
                ? await stripe.subscriptions.retrieve(session.subscription)
                : null;

        const isSubscriptionEvent = [
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ].includes(event.type);

        const currentSubscription = isSubscriptionEvent
            ? event.type === "customer.subscription.deleted"
                ? event.data.object
                : await stripe.subscriptions.retrieve(event.data.object.id)
            : null;
        const eventCreated = BigInt(event.created);

        //identifies what happened
        await prisma.$transaction(async (tx) => {
            const inserted = await tx.stripeWebhookEvent.createMany({
                data: [{ id: event.id }],
                skipDuplicates: true,
            });

            if (inserted.count === 0) {
                return;
            }

            switch (event.type) {
                case "checkout.session.completed":
                case "checkout.session.async_payment_succeeded": {
                    if (!session || !checkoutSubscription) {
                        break;
                    }

                    const subscription = checkoutSubscription;

                    if (subscription.customer !== session.customer) {
                        throw new Error("Checkout session and subscription customers do not match");
                    }

                    if (!["active", "trialing"].includes(subscription.status)) {
                        break;
                    }

                    const user = await tx.user.findUnique({
                        where: {
                            stripeCustomerId: session.customer,
                        },
                    });

                    if (!user) {
                        throw new Error("No user found for this Stripe customer");
                    }

                    //checks if user already have subscription
                    if (
                        user.stripeSubscriptionId &&
                        user.stripeSubscriptionId !== subscription.id
                    ) {
                        break;
                    }

                    const item = subscription.items.data[0];
                    const periodEnd = item?.current_period_end;

                    if (!item || !periodEnd) {
                        throw new Error("Subscription billing period is missing");
                    }

                    await tx.user.updateMany({
                        where: {
                            id: user.id,
                            OR: [
                                //only if user have no prev subs id or matching id
                                { stripeSubscriptionId: null },
                                { stripeSubscriptionId: subscription.id },
                            ],
                            AND: [
                                {
                                    OR: [
                                        //checks if last event exists or the last event must be less as its old event...then the newer event one 
                                        { lastStripeEventCreated: null },
                                        { lastStripeEventCreated: { lt: eventCreated } },
                                    ],
                                },
                            ],
                        },
                        data: {
                            tier: "PRO",
                            stripeSubscriptionId: subscription.id,
                            stripePriceId: item.price.id,
                            stripeCurrentPeriodEnd: new Date(periodEnd * 1000),
                            lastStripeEventCreated: eventCreated,
                        },
                    });

                    break;

                }
                case "customer.subscription.updated":
                case "customer.subscription.deleted": {
                    const subscription = currentSubscription;

                    const customerId =
                        typeof subscription.customer === "string"
                            ? subscription.customer
                            : subscription.customer.id;

                    const user = await tx.user.findUnique({
                        where: {
                            stripeCustomerId: customerId,
                        },
                    });

                    if (!user) {
                        throw new Error("No user found for this Stripe customer");
                    }

                    // only update the subscription currently that matches to this user.
                    if (user.stripeSubscriptionId !== subscription.id) {
                        break;
                    }

                    const isDeleted = event.type === "customer.subscription.deleted";

                    const hasAccess =
                        !isDeleted &&
                        ["active", "trialing"].includes(subscription.status);

                    const item = subscription.items.data[0];

                    await tx.user.updateMany({
                        where: {
                            id: user.id,
                            stripeSubscriptionId: subscription.id,
                            AND: [
                                {
                                    OR: [
                                        { lastStripeEventCreated: null },
                                        { lastStripeEventCreated: { lt: eventCreated } },
                                    ],
                                },
                            ],
                        },
                        data: {
                            tier: hasAccess ? "PRO" : "FREE",

                            // Keep the subscription ID for non-deleted subscriptions.
                            // Clear it only when Stripe confirms deletion.
                            stripeSubscriptionId: isDeleted ? null : subscription.id,

                            stripePriceId: isDeleted ? null : item?.price.id ?? null,

                            stripeCurrentPeriodEnd: isDeleted
                                ? null
                                : item?.current_period_end
                                    ? new Date(item.current_period_end * 1000)
                                    : null,

                            lastStripeEventCreated: eventCreated,
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

                    break;
                }

                default:
                    break;
            }
        });

        return res.sendStatus(200);

    }
    catch (error) {
        console.error("Webhook processing failed:", error);

        return res.status(500).json({
            error: "Failed to process webhook",
        });
    }
};

module.exports = handleStripeWebhook;