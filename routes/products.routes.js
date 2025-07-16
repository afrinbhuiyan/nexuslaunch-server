const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const reportsCollection = db.collection("reports");
  const productsCollection = db.collection("products");
  const usersCollection = db.collection("users");

  // GET /api/products?search=design
  router.get("/", async (req, res) => {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    try {
      const query = {
        status: "approved",
        tags: { $regex: search, $options: "i" }, // searching by tag
      };

      const total = await productsCollection.countDocuments(query);
      const products = await productsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send({ products, total });
    } catch (err) {
      console.error("Fetch error:", err);
      res.status(500).send({ message: "Failed to fetch products" });
    }
  });

  // Add to products.routes.js
  router.get("/all", async (req, res) => {
    try {
      const products = await productsCollection
        .find({
          status: { $in: ["approved", "pending"] }, // Show both
          name: { $regex: req.query.search || "", $options: "i" },
        })
        .sort({ timestamp: -1 })
        .toArray();
      res.send(products);
    } catch (err) {
      res.status(500).send({ message: "Failed to fetch products" });
    }
  });

  // GET /api/products/user-count?email=email@example.com
  router.get("/user-count", async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const count = await productsCollection.countDocuments({
      "owner.email": email,
    });
    res.json({ count });
  });

  // Add Product
  router.post("/add", async (req, res) => {
    const product = req.body;
    const userEmail = product?.owner?.email;

    try {
      // Check user from DB
      const user = await usersCollection.findOne({ email: userEmail });
      if (!user) return res.status(403).json({ message: "Unauthorized user." });

      // Check how many products this user already added
      const productCount = await productsCollection.countDocuments({
        "owner.email": userEmail,
      });

      if (!user.isSubscribed && productCount >= 1) {
        return res.status(403).json({
          message: "Only one product allowed for free users. Please subscribe.",
        });
      }

      // Insert product
      const result = await productsCollection.insertOne(product);
      res.json({ success: true, insertedId: result.insertedId });
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  // Add this new endpoint for featuring products
  router.patch("/:id/feature", async (req, res) => {
    const { id } = req.params;
    const { isFeatured } = req.body;

    try {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isFeatured } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({
        success: true,
        message: `Product ${
          isFeatured ? "featured" : "unfeatured"
        } successfully`,
      });
    } catch (err) {
      console.error("Feature toggle error:", err);
      res.status(500).json({ message: "Failed to update featured status" });
    }
  });

  // Update the featured products endpoint
  router.get("/featured", async (req, res) => {
    try {
      const featuredProducts = await productsCollection
        .find({
          isFeatured: true,
          status: "approved", // Only approved products can be featured
        })
        .sort({ timestamp: -1 })
        .limit(4)
        .toArray();

      res.send(featuredProducts);
    } catch (err) {
      console.error("Failed to fetch featured products:", err);
      res.status(500).send({
        success: false,
        error: "Could not load featured products",
      });
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
  router.get("/user/:email", verifyToken, async (req, res) => {
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
  router.get("/pending", verifyToken, async (req, res) => {
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
        { $set: { status: "approved" } }
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

  // ✅ DELETE a product by ID AND its reports
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      // Check for valid ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      // Delete product
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      // ✅ Delete associated reports
      await reportsCollection.deleteMany({ productId: id });

      res.json({ success: true, message: "Product and its reports deleted" });
    } catch (err) {
      console.error("Error deleting product and reports:", err);
      res.status(500).json({ message: "Error deleting product and reports" });
    }
  });

  router.patch("/vote/:id", verifyToken, async (req, res) => {
    try {
      const productId = req.params.id;
      const userEmail = req.user.email;

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

  // For GET /api/products/reported
  router.get("/reported", verifyToken, async (req, res) => {
    try {
      const reportedProducts = await productsCollection
        .find({
          "reports.0": { $exists: true },
        })
        .toArray();
      res.json(reportedProducts);
    } catch (err) {
      console.error("Error fetching reported products:", err);
      res.status(500).json({ message: "Error fetching reported products" });
    }
  });

  return router;
};
