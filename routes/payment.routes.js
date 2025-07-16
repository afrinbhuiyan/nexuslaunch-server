const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = (client) => {
  const router = express.Router();
  const db = client.db("apporbitDB");
  const usersCollection = db.collection("users");

  // ✅ Create Payment Intent
  router.post("/create-payment-intent", async (req, res) => {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to cents
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // ✅ Check subscription status
  router.get("/subscription-status", async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      res.json({ isSubscribed: user.isSubscribed || false });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ✅ Update subscription
  router.patch("/subscribe", async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
      const result = await usersCollection.updateOne(
        { email },
        { $set: { isSubscribed: true } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "User not updated" });
      }

      res.json({ success: true, message: "Subscription updated" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};
