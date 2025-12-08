import express from "express";
import { db } from "../config/db.js";

const router = express.Router();

// GET all bins
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM bins");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching bins:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET bin by bin_code  (preferred endpoint)
router.get("/code/:binCode", async (req, res) => {
  try {
    const { binCode } = req.params;
    const [rows] = await db.query("SELECT * FROM bins WHERE bin_code=?", [
      binCode,
    ]);

    if (!rows.length)
      return res.status(404).json({ error: "Bin not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching bin:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// fallback (optional)
router.get("/:binCode", async (req, res) => {
  try {
    const { binCode } = req.params;
    const [rows] = await db.query("SELECT * FROM bins WHERE bin_code=?", [
      binCode,
    ]);

    if (!rows.length)
      return res.status(404).json({ error: "Bin not found" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
