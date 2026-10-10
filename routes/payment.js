
const express = require("express");

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();
const auth = require("../middleware/auth");
const prisma = require("../config/db");

router.post('/create-checkout-session', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.userId
            }
        })
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            })
        }
        if (user.tier !== 'FREE') {
            return res.status(409).json({ error: 'User already has a paid plan' });
        }

        // Reuse the customer's ID from the database, not the JWT payload.
        let stripeId = user.stripeCustomerId


        if (!stripeId) {
            //creating customer record on stripe server (also creates its id)
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: String(user.id) },
            })

            //updating stripe id
            stripeId = customer.id

            //updating stripe id in db
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: stripeId },
            });
        }

        //creating checkout subscription payment page
        const session = await stripe.checkout.sessions.create({
            //creating object
            customer: stripeId,
            payment_method_types: ['card'],
            mode: 'subscription',
            //what the customer is purchasing
            line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
            success_url: `${process.env.CLIENT_URL}/dashboard?payment=success`,
            cancel_url: `${process.env.CLIENT_URL}/pricing?payment=cancelled`,
            metadata: { userId: String(user.id) }
        });

        //returns payment url
        return res.status(201).json({
            url: session.url
        })
    }
    catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Failed to create checkout session' });

    }
})

router.post('/create-portal-session', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        if (!user.stripeCustomerId) {
            return res.status(400).json({
                error: "No Stripe customer found for this user",
            });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.CLIENT_URL}/dashboard`
        })

        return res.json({
            url: portalSession.url,

        })
    } catch (error) {
        console.error("Failed to create billing portal:", error);

        return res.status(500).json({
            error: "Failed to create billing portal session",
        });

    }



})

module.exports = router