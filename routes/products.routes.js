// routes/products.routes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const productsCollection = db.collection("products");

  // Add Product
  router.post("/add", async (req, res) => {
    const product = req.body;
    try {
      const result = await productsCollection.insertOne(product);
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: "Failed to add product" });
    }
  });

  router.get("/add", async (req, res) => {
    const result = await productsCollection.find().toArray();
    res.send(result);
  });

  

  // ✅ Get Featured Products
  router.get("/featured", async (req, res) => {
    try {
      const featuredProducts = await productsCollection
        .find()
        .sort({ timestamp: -1 })
        .limit(4)
        .toArray();

      res.send(featuredProducts);
    } catch (err) {
      console.error("Failed to fetch featured products:", err);
      res.status(500).send({ error: "Could not load featured products" });
    }
  });

  return router;
};
