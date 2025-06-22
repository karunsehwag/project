import express from "express";
import { findOrCreateContact } from "../utils/helper";

const router = express.Router();

router.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;
  try {
    const data = await findOrCreateContact(email, phoneNumber);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
