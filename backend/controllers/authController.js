const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const users = [
  {
    id: 1,
    username: "admin",
    password: bcrypt.hashSync("12345", 10),
    role: "admin",
  },
  {
    id: 2,
    username: "operator",
    password: bcrypt.hashSync("12345", 10),
    role: "operator",
  },
];

async function login(req, res) {
  try {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { login };