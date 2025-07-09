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

  router.get("/test", (req, res) => {
    res.send("✅ Product route working");
  });

  return router;
};
