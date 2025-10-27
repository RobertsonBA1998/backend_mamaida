// server.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const uploadsDir = path.join(__dirname, "public/uploads");
const productsFile = path.join(__dirname, "data/products.json");
const usersFile = path.join(__dirname, "data/users.json");

// Ensure directories & files exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, "[]");
if (!fs.existsSync(usersFile)) {
 fs.writeFileSync(
  usersFile,
  JSON.stringify([{ username: "admin", password: "admin123" }])
 );
}

// ---------- MIDDLEWARE ----------

// Frontend origins
const FRONTEND_ORIGINS = [
 "https://mamaidashoes.com", // Production frontend
 "https://mamaidashoes.netlify.app/",
 "http://127.0.0.1:5500", // Local dev
];

app.use(
 cors({
  origin: function (origin, callback) {
   if (!origin || FRONTEND_ORIGINS.includes(origin)) {
    callback(null, true);
   } else {
    callback(new Error("CORS not allowed"));
   }
  },
  credentials: true, // Allow cookies
 })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session setup
app.set("trust proxy", 1); // Needed for Render behind a proxy
app.use(
 session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
   secure: process.env.NODE_ENV === "production", // HTTPS only in prod
   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
   httpOnly: true,
  },
 })
);

// Multer setup for file uploads
const storage = multer.diskStorage({
 destination: (req, file, cb) => cb(null, uploadsDir),
 filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Helper functions
const loadProducts = () => JSON.parse(fs.readFileSync(productsFile));
const saveProducts = (products) =>
 fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
const loadUsers = () => JSON.parse(fs.readFileSync(usersFile));

// Auth middleware
function requireLogin(req, res, next) {
 if (req.session.loggedIn) next();
 else res.status(401).send("Unauthorized");
}

// ---------------------- ROUTES ----------------------

// Login
app.post("/login", (req, res) => {
 const { username, password } = req.body;
 const user = loadUsers().find(
  (u) => u.username === username && u.password === password
 );
 if (user) {
  req.session.loggedIn = true;
  req.session.username = username;
  res.json({ success: true });
 } else {
  res.status(401).json({ success: false, message: "Invalid credentials" });
 }
});

// Logout
app.get("/logout", (req, res) => {
 req.session.destroy(() => res.json({ success: true }));
});

// Serve dashboard (protected)
app.get("/dashboard", requireLogin, (req, res) => {
 res.sendFile(path.join(__dirname, "views/dashboard.html"));
});

// Get all products (public)
app.get("/products", (req, res) => {
 res.json(loadProducts());
});

// Add/Edit product (protected)
app.post(
 "/update-product",
 requireLogin,
 upload.single("productImage"),
 (req, res) => {
  try {
   const { productName, category, inStock, originalName } = req.body;
   const image = req.file ? "/uploads/" + req.file.filename : null;
   if (!productName || !category) return res.status(400).send("Missing fields");

   let products = loadProducts();
   const existing = products.find(
    (p) => p.name === originalName || (!originalName && p.name === productName)
   );

   if (existing) {
    existing.name = productName;
    existing.category = category;
    existing.inStock = inStock === "true";
    if (image) existing.image = image;
   } else {
    products.push({
     name: productName,
     category,
     image: image || "",
     inStock: inStock === "true",
    });
   }

   saveProducts(products);
   res.sendStatus(200);
  } catch (err) {
   console.error("Error saving product:", err);
   res.status(500).send("Internal server error");
  }
 }
);

// Delete product (protected)
app.delete("/delete-product", requireLogin, (req, res) => {
 const name = req.query.name;
 let products = loadProducts();
 products = products.filter((p) => p.name !== name);
 saveProducts(products);
 res.sendStatus(200);
});

// Root route
app.get("/", (req, res) => {
 res.send("Mama Ida Shoes backend is running! 👟");
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
