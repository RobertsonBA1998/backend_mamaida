// ---------- MIDDLEWARE ----------

const FRONTEND_ORIGINS = [
 "https://mamaidashoes.com", // production frontend
 "http://127.0.0.1:5500", // local dev frontend
];

app.use(
 cors({
  origin: function (origin, callback) {
   // Allow requests with no origin (like Postman) or if origin is in the list
   if (!origin || FRONTEND_ORIGINS.includes(origin)) {
    callback(null, true);
   } else {
    callback(new Error("CORS not allowed"));
   }
  },
  credentials: true, // Allow cookies to be sent cross-origin
 })
);

// Parse JSON & URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session setup
app.set("trust proxy", 1); // Needed for secure cookies behind proxies (like Render)
app.use(
 session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
   secure: process.env.NODE_ENV === "production", // HTTPS only in prod
   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // cross-site cookies in prod
   httpOnly: true,
  },
 })
);
