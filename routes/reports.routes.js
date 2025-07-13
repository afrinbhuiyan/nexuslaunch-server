const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const reportsCollection = db.collection("reports");
  const productsCollection = db.collection("products");

  // Get all reports (for admin)
  // Get reported products with embedded report info
  router.get("/", async (req, res) => {
    try {
      const reportedProducts = await productsCollection
        .find({
          "reports.0": { $exists: true },
        })
        .sort({ timestamp: -1 })
        .toArray();

      res.json(reportedProducts);
    } catch (err) {
      console.error("Error fetching reported products:", err);
      res.status(500).json({ message: "Error fetching reported products" });
    }
  });

  // Create report
  router.post("/", async (req, res) => {
    try {
      const report = {
        productId: req.body.productId,
        reporterId: req.body.reporterId,
        reason: req.body.reason || "Inappropriate content",
        timestamp: new Date(),
        status: "pending",
      };

      // Add report to reports collection
      await reportsCollection.insertOne(report);

      // Also add to product's reports array
      await productsCollection.updateOne(
        { _id: new ObjectId(req.body.productId) },
        { $push: { reports: report } }
      );

      res.status(201).json(report);
    } catch (err) {
      res.status(500).json({ message: "Error creating report" });
    }
  });

  return router;
};
