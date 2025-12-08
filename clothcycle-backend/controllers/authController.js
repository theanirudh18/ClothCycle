import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    // Check if email already exists
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length)
      return res.status(409).json({ error: "Email already registered" });

    const hash = bcrypt.hashSync(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name,email,password_hash,points,donations) VALUES (?,?,?,?,?)",
      [name, email, hash, 0, 0]
    );

    const userId = result.insertId;

    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        email,
        points: 0,
        donations: 0,
      },
    });

  } catch (err) {
    // Handle duplicate email from MySQL
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already registered" });
    }

    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email]);

  if (!rows.length)
    return res.status(401).json({ error: "User not found" });

  const user = rows[0];

  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      points: user.points,
      donations: user.donations,
    },
  });
};
