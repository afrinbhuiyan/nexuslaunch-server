const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const couponsCollection = db.collection("coupons");

  // GET all coupons
  router.get("/", async (req, res) => {
    const coupons = await couponsCollection
      .find()
      .sort({ expiry: 1 })
      .toArray();
    res.send(coupons);
  });

  // GET valid (non-expired) coupons
  router.get("/valid", async (req, res) => {
    const today = new Date();

    try {
      const validCoupons = await couponsCollection
        .find({ expiry: { $gte: today } })
        .sort({ expiry: 1 })
        .toArray();

      res.send(validCoupons);
    } catch (error) {
      console.error("Error fetching valid coupons", error);
      res.status(500).send({ message: "Server error" });
    }
  });

  // POST a new coupon
  router.post("/", async (req, res) => {
    const coupon = req.body;

    // ✅ Convert expiry string to Date
    coupon.expiry = new Date(coupon.expiry);

    try {
      const result = await couponsCollection.insertOne(coupon);
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to create coupon" });
    }
  });

  // POST /api/payment/create-payment-intent
  router.post("/create-payment-intent", async (req, res) => {
    const { amount, email, couponCode } = req.body;

    let finalAmount = amount;

    // 🔹 Check and apply valid coupon
    if (couponCode) {
      const coupon = await db.collection("coupons").findOne({
        code: couponCode,
        expiry: { $gte: new Date() },
      });

      if (!coupon) {
        return res.status(400).json({ message: "Invalid or expired coupon" });
      }

      const discount = (coupon.discountPercentage / 100) * amount;
      finalAmount = Math.max(0, Math.round(amount - discount));
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: "usd",
        metadata: { email, couponUsed: couponCode || "none" },
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error("Stripe Error:", err);
      res.status(500).json({ message: "Payment intent creation failed" });
    }
  });

  // PATCH - update coupon
  router.patch("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await couponsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.send(result);
  });

  // DELETE a coupon
  router.delete("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await couponsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  });

  return router;
};
