const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
app.use(cors({ 
  origin: ["http://localhost:5173"], 
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// MongoDB client
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("✅ Successfully connected to MongoDB");

    // Verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Get database reference
    const db = client.db("apporbitDB");
    
    // Verify products collection exists
    const collections = await db.listCollections().toArray();
    const productCollectionExists = collections.some(col => col.name === "products");
    
    if (!productCollectionExists) {
      console.warn("⚠️ 'products' collection does not exist in the database");
    } else {
      const productsCount = await db.collection("products").countDocuments();
      console.log(`📊 Found ${productsCount} products in the collection`);
    }

    // Setup routes
    const productRoutes = require("./routes/products.routes")(client);
    app.use("/api/products", productRoutes);

    // Root endpoint
    app.get("/", (req, res) => {
      res.send("🔥 AppOrbit server running!");
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error("Server error:", err);
      res.status(500).json({ error: "Internal server error" });
    });

  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("🔥 AppOrbit server running!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
