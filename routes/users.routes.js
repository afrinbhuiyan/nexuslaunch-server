const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const usersCollection = db.collection("users");

  router.get("/", async (req, res) => {
    try {
      const users = await usersCollection.find().toArray();
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get subscription status by email (GET /api/users/subscription-status?email=...)
  router.get("/subscription-status", async (req, res) => {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    try {
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ subscribed: user.subscribed || false });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upsert user by email (PUT /api/users/:email)
  router.put("/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;

    const filter = { email };
    const updateDoc = { $set: user };
    const options = { upsert: true };

    try {
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    } catch (err) {
      console.error("User upsert failed:", err);
      res.status(500).json({ message: "User upsert failed" });
    }
  });

  // Update user role by user ID (PATCH /api/users/role/:id)
  router.patch("/role/:id", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    try {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ success: true, message: "User role updated" });
    } catch (err) {
      console.error("Role update failed:", err);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  return router;
};
