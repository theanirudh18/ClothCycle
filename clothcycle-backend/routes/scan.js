import express from "express";
import { db } from "../config/db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { binCode, items, kg, userId } = req.body;

    if (!binCode || !items || !kg || !userId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1️⃣ Find bin
    const [binRows] = await db.query("SELECT * FROM bins WHERE bin_code = ?", [
      binCode,
    ]);
    if (!binRows.length)
      return res.status(404).json({ error: "Invalid bin code" });

    const bin = binRows[0];

    // 2️⃣ Insert donation
    const pointsEarned = items * 10;

    await db.query(
      "INSERT INTO donations (user_id, bin_id, items, weight_kg, points_earned) VALUES (?,?,?,?,?)",
      [userId, bin.id, items, kg, pointsEarned]
    );

    // 3️⃣ Update user's total points & donation count
    await db.query(
      "UPDATE users SET points = points + ?, donations = donations + ? WHERE id = ?",
      [pointsEarned, items, userId]
    );

    // 4️⃣ Update global impact
    await db.query(
      "UPDATE impact SET total_kg = total_kg + ?, families_helped = families_helped + ?, co2_saved_kg = co2_saved_kg + ? WHERE id = 1",
      [kg, Math.floor(items / 2), kg * 20]
    );

    // 5️⃣ BADGE LOGIC (NEW)
    const earnedBadges = [];

    // Fetch updated user stats
    const [[user]] = await db.query("SELECT points, donations FROM users WHERE id = ?", [userId]);

    // Badge 1: First Donation
    if (user.donations >= 1) {
      await awardBadge(userId, 1, earnedBadges);      
    }

    // Badge 2: Eco Supporter — 100 points
    if (user.points >= 100) {
      await awardBadge(userId, 2, earnedBadges);
    }

    // Badge 3: Dedicated Donor — 10 donations
    if (user.donations >= 10) {
      await awardBadge(userId, 3, earnedBadges);
    }

    res.json({
      success: true,
      awardedPoints: pointsEarned,
      newBadges: earnedBadges
    });

  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// helper
async function awardBadge(userId, badgeId, earnedList) {
  const [exists] = await db.query(
    "SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?",
    [userId, badgeId]
  );

  if (exists.length === 0) {
    await db.query(
      "INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)",
      [userId, badgeId]
    );

    // fetch badge name
    const [[badge]] = await db.query("SELECT name FROM badges WHERE id = ?", [badgeId]);
    earnedList.push(badge.name);
  }
}

export default router;
