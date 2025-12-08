import express from "express";
import { db } from "../config/db.js";

const router = express.Router();

/*
  GET /user/:id
  Returns user profile, donation history, badges
*/
router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    // 1️⃣ Get profile
    const [users] = await db.query(
      "SELECT id, name, email, points, donations FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0)
      return res.status(404).json({ error: "User not found" });

    // 2️⃣ Get donation history
    const [history] = await db.query(
      "SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    // 3️⃣ Get badges for the user
    const [badges] = await db.query(`
      SELECT b.id, b.name, b.description
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `, [userId]);

    // 4️⃣ Return response
    res.json({
      success: true,
      profile: users[0],
      history,
      badges
    });

  } catch (err) {
    console.error("User error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/*
  PUT /user/:id/update
*/
router.put("/:id/update", async (req, res) => {
  const userId = req.params.id;
  const { name, email } = req.body;

  try {
    await db.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, userId]
    );

    res.json({ success: true, message: "User updated successfully" });

  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
