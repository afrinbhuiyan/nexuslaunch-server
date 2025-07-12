const express = require("express");
const router = express.Router();

module.exports = (client) => {
  const db = client.db("apporbitDB");
  const usersCollection = db.collection("users");

  // Upsert user
  router.put("/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;

    const filter = { email };
    const updateDoc = {
      $set: user,
    };

    const options = { upsert: true };

    try {
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    } catch (err) {
      res.status(500).json({ message: "User upsert failed" });
    }
  });

  // GET /api/users/subscription-status?email=...
  router.get("/subscription-status", async (req, res) => {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const user = await db.collection("users").findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isSubscribed = user.subscribed || false;

      res.json({ subscribed: isSubscribed });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
};
