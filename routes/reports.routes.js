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
    const { productId, reporterId } = req.body;

    try {
      if (!ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid productId" });
      }

      // Check if this user already reported this product
      const product = await productsCollection.findOne({
        _id: new ObjectId(productId),
      });
      if (product?.reports?.some((r) => r.reporterId === reporterId)) {
        return res
          .status(400)
          .json({ message: "You have already reported this product." });
      }

      const report = {
        productId,
        reporterId,
        reason: req.body.reason || "Inappropriate content",
        timestamp: new Date(),
        status: "pending",
      };

      // Save to reports collection (optional)
      await reportsCollection.insertOne(report);

      // Save to product document
      await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $push: { reports: report } }
      );

      res.status(201).json({ success: true, report });
    } catch (err) {
      console.error("Error creating report:", err);
      res.status(500).json({ message: "Error creating report" });
    }
  });

  return router;
};
