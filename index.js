const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["MONGODB_URI", "PORT"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(cookieParser());

// MongoDB client
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 50, // Connection pool size
  wtimeoutMS: 2500,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

async function initializeRoutes(client) {
  const routesDir = path.join(__dirname, "routes");
  const routeConfig = [
    { file: "products.routes", path: "/api/products" },
    { file: "reviews.routes", path: "/api/reviews" },
    { file: "reports.routes", path: "/api/reports" },
    { file: "users.routes", path: "/api/users" },
    { file: "payment.routes", path: "/api/payment" },
    { file: "statistics.routes", path: "/api/statistics" },
    { file: "coupons.routes", path: "/api/coupons" },
  ];

  for (const { file, path: routePath } of routeConfig) {
    const filePath = path.join(routesDir, file + ".js");
    try {
      if (fs.existsSync(filePath)) {
        const routeHandler = require(filePath)(client);
        app.use(routePath, routeHandler);
        console.log(`✅ Route initialized: ${routePath}`);
      } else {
        console.warn(`⚠️ Route file not found: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error loading route ${file}:`, err);
    }
  }
}

async function verifyCollections(db) {
  const requiredCollections = [
    "products",
    "reviews",
    "reports",
    "users",
    "payments",
    "statistics",
    "coupons"
  ];

  const existingCollections = (await db.listCollections().toArray()).map(
    (col) => col.name
  );

  for (const col of requiredCollections) {
    if (!existingCollections.includes(col)) {
      console.warn(`⚠️ Collection does not exist: ${col}`);
    } else {
      try {
        const count = await db.collection(col).countDocuments();
        console.log(`📊 Collection ${col} has ${count} documents`);
      } catch (err) {
        console.error(`❌ Error counting documents in ${col}:`, err);
      }
    }
  }
}

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

    // Verify collections
    await verifyCollections(db);

    // Initialize routes
    await initializeRoutes(client);

    // Root endpoint
    app.get("/", (req, res) => {
      res.json({
        message: "🔥 AppOrbit server running!",
        version: "1.0.0",
        routes: [
          "/api/products",
          "/api/reviews",
          "/api/reports",
          "/api/users",
          "/api/payment",
          "/api/statistics",
          "/api/coupons"
        ]
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ 
        error: "Endpoint not found",
        availableEndpoints: [
          "/api/products",
          "/api/reviews",
          "/api/reports",
          "/api/users",
          "/api/payment",
          "/api/statistics",
          "/api/coupons",
          "/health"
        ]
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error("Server error:", err);
      res.status(500).json({ 
        error: "Internal server error",
        timestamp: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server gracefully...");
  try {
    await client.close();
    console.log("✅ MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
});

// Start server
run().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});

// Only keep one server listen call
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`🌐 Access the server at http://localhost:${port}`);
});