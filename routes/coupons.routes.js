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
  router.get("/valid", verifyToken, async (req, res) => {
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
