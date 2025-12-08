import express from "express";
import { db } from "../config/db.js";

const router = express.Router();

/*
  MAIN LEADERBOARD:
  Shows all users sorted by total donation weight (kg)
*/
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.name,
        COALESCE(SUM(d.weight_kg), 0) AS total_kg
      FROM users u
      LEFT JOIN donations d ON u.id = d.user_id
      GROUP BY u.id
      ORDER BY total_kg DESC
    `);

    res.json(rows);

  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/*
  GLOBAL IMPACT SUMMARY (still required for Impact Page)
*/
router.get("/impact", async (req, res) => {
  try {
    const [[impact]] = await db.query("SELECT * FROM impact LIMIT 1");

    res.json({
      kg: impact.total_kg,
      families: impact.families_helped,
      co2: impact.co2_saved_kg,
      volunteers: 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
