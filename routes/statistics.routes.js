const express = require("express");
const router = express.Router();

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const productsCollection = db.collection("products");
  const usersCollection = db.collection("users");
  const reviewsCollection = db.collection("reviews");

  // GET /api/statistics
  router.get("/", async (req, res) => {
    try {
      const [totalProducts, pendingProducts, approvedProducts, users, reviews] =
        await Promise.all([
          productsCollection.countDocuments(),
          productsCollection.countDocuments({ status: "pending" }),
          productsCollection.countDocuments({ status: "approved" }),
          usersCollection.countDocuments(),
          reviewsCollection.countDocuments(),
        ]);

      res.json({
        totalProducts,
        pendingProducts,
        approvedProducts,
        totalUsers: users,
        totalReviews: reviews,
      });
    } catch (err) {
      console.error("Statistics fetch error:", err);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  return router;
};
