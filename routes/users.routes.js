const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const usersCollection = db.collection("users");

  // 1. Get all users (protected)
  router.get("/", verifyToken, async (req, res) => {
    try {
      const users = await usersCollection.find().toArray();
      res.json({ success: true, users });
    } catch (err) {
      console.error("Error fetching users:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch users" });
    }
  });

  // 2. Get subscription status by email (protected)
  router.get("/subscription-status", verifyToken, async (req, res) => {
    const email = req.query.email;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    try {
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.json({ success: true, subscribed: user.subscribed || false });
    } catch (error) {
      console.error("Subscription status error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  router.get("/by-uid/:uid", verifyToken, async (req, res) => {
    try {
      const uid = req.params.uid;
      const user = await usersCollection.findOne({ uid });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user: {
          email: user.email,
          role: user.role || "user",
          isSubscribed: user.isSubscribed || false,
          name: user.name,
          image: user.image,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  });

  // 3. Get user by email (protected)
  // In your users.routes.js (backend)
  router.get("/by-email/:email", verifyToken, async (req, res) => {
    try {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user: {
          email: user.email,
          role: user.role || "user", // Ensure default role
          isSubscribed: user.isSubscribed || false,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  });

  // 4. Upsert user by email (protected)
  router.put("/email/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const userData = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $set: userData },
        { upsert: true }
      );

      res.json({
        success: true,
        updated: result.modifiedCount,
        created: result.upsertedCount,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // 5. Update user role by user ID (protected)
  router.patch("/role/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }
    if (!role) {
      return res
        .status(400)
        .json({ success: false, message: "Role is required" });
    }

    try {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.json({ success: true, message: "User role updated" });
    } catch (err) {
      console.error("Role update failed:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update user role" });
    }
  });

  return router;
};
