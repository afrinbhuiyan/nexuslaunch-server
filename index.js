const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
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
    await client.connect();

    // const db = client.db("apporbitDB");
    // const productsCollection = db.collection("products");

    const productRoutes = require("./routes/products.routes")(client);
    app.use("/api/products", productRoutes);

    app.get("/test", (req, res) => {
      res.send("✅ Product route working");
    });

    // TODO: Import and use route files like:
    // app.use('/api/products', productsRoutes)
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error(err);
  }
}

run();

app.get("/", (req, res) => {
  res.send("🔥 AppOrbit server running!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
