const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const productsCollection = db.collection("products");

  // Add Product
  router.post("/add", async (req, res) => {
    const product = {
      ...req.body,
      status: "pending", // Add default status
      timestamp: new Date(), // Add timestamp for sorting
      upvotes: 0, // Initialize votes
      voters: [], // Initialize voters array
    };

    try {
      const result = await productsCollection.insertOne(product);
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: "Failed to add product" });
    }
  });

  router.get("/all", async (req, res) => {
    const result = await productsCollection.find().toArray();
    res.send(result);
  });

  // GET /api/products?search=design
  router.get("/", async (req, res) => {
    const search = req.query.search || "";
    try {
      const products = await productsCollection
        .find({
          status: "approved",
          name: { $regex: search, $options: "i" },
        })
        .sort({ timestamp: -1 })
        .toArray();
      res.send(products);
    } catch (err) {
      res.status(500).send({ message: "Failed to fetch products" });
    }
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

  // ✅ Trending Products (Top 6 by upvotes)
  router.get("/trending", async (req, res) => {
    try {
      const trending = await productsCollection
        .find() // or remove this line if not needed
        .sort({ upvotes: -1, timestamp: -1 })
        .limit(6)
        .toArray();

      res.send(trending);
    } catch (err) {
      console.error("Trending Route Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ✅ GET Products by User Email (for My Products Page)
  // Update the user products endpoint to use owner.email
  router.get("/user/:email", async (req, res) => {
    try {
      const products = await productsCollection
        .find({
          "owner.email": req.params.email, // Changed from userEmail to owner.email
        })
        .toArray();
      res.send(products);
    } catch (err) {
      console.error("Error fetching user's products:", err);
      res.status(500).json({ message: "Error fetching user's products" });
    }
  });

  // Add this new endpoint for admin approval
  router.get("/pending", async (req, res) => {
    try {
      const products = await productsCollection
        .find({ status: "pending" })
        .toArray();
      res.send(products);
    } catch (err) {
      res.status(500).send({ message: "Failed to fetch pending products" });
    }
  });

  router.patch("/accept/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "accepted" } }
      );
      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "Product not found or not modified" });
      }
      res.json({ success: true, message: "Product accepted" });
    } catch (error) {
      console.error("Accept error:", error);
      res.status(500).json({ message: "Server error while accepting product" });
    }
  });

  // Reject product
  router.patch("/reject/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Rejected" } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Rejection failed" });
    }
  });

  router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    try {
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "Product not found or not modified" });
      }

      res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ message: "Server error while updating product" });
    }
  });

  // ✅ DELETE a product by ID
  router.delete("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ success: true, message: "Product deleted" });
    } catch (err) {
      console.error("Error deleting product:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // PATCH /api/products/vote/:id
  router.patch("/vote/:id", async (req, res) => {
    try {
      const productId = req.params.id;
      const userEmail = req.body.email;

      if (!ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await productsCollection.findOne({
        _id: new ObjectId(productId),
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.voters?.includes(userEmail)) {
        return res.status(400).json({ message: "You already voted" });
      }

      const updated = await productsCollection.findOneAndUpdate(
        { _id: new ObjectId(productId) },
        {
          $inc: { upvotes: 1 },
          $push: { voters: userEmail },
        },
        { returnDocument: "after" }
      );

      res.json({ success: true, updatedProduct: updated.value });
    } catch (err) {
      console.error("Vote error:", err);
      res.status(500).json({ message: "Server error while voting" });
    }
  });

  // Get a single product by ID
  router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({ success: true, product });
    } catch (err) {
      console.error("Failed to fetch product:", err);
      res.status(500).json({
        success: false,
        message: "Server error while fetching product",
      });
    }
  });

  return router;
};
