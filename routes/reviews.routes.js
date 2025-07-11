const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const reviewsCollection = db.collection("reviews");

  // GET reviews for a product
  router.get("/", async (req, res) => {
    const { productId } = req.query;

    try {
      const reviews = await reviewsCollection
        .find({ productId })
        .sort({ timestamp: -1 })
        .toArray();
      res.send(reviews);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // POST a review
  router.post("/", async (req, res) => {
    const review = req.body;

    try {
      const result = await reviewsCollection.insertOne(review);
      res.send(result.ops?.[0] || review); // optional: return inserted doc
    } catch (err) {
      res.status(500).json({ message: "Failed to post review" });
    }
  });

  return router;
};
