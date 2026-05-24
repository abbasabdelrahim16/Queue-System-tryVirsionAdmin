const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors   = require("cors");

// ─── Routes ──────────────────────────────────────────────────────
const customerRoutes = require("./routes/customerRoutes");
const operatorRoutes = require("./routes/operatorRoutes");
const authRoutes     = require("./routes/authRoutes");
const serviceRoutes  = require("./routes/serviceRoutes");

// ─── App ─────────────────────────────────────────────────────────
const app = express();

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

// ─── HTTP + Socket.io ─────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ─── Test route ───────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("🚀 Server + Socket.io running");
});

// ─── API Routes ───────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/operator",  operatorRoutes);
app.use("/api",           serviceRoutes);

// ─── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(500).json({ error: err.message });
});

// ─── Notification scheduler ───────────────────────────────────────
const { checkUpcomingTickets } = require("./notificationScheduler");
setInterval(() => { checkUpcomingTickets(io); }, 5000);

// ─── Start ────────────────────────────────────────────────────────
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});