const io = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("new-ticket", (data) => {
  console.log("🔥 REAL-TIME EVENT:", data);
});
socket.on("queue-update", (data) => {
  console.log("⚡ QUEUE UPDATE:", data);
}); 