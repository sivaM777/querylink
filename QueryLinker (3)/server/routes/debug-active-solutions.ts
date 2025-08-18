// Temporary route to check if there are any active solutions in the database
import express from "express";
import { getDatabase } from "../database/database";

const router = express.Router();

router.get("/api/querylinker/debug/active-solutions", (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT COUNT(*) as count FROM solutions WHERE sync_status = 'active'").get();
    res.json({ active_solutions: (row as any).count });
  } catch (error) {
    res.status(500).json({ error: "Failed to query database", details: (error as any).message });
  }
});

export default router;
