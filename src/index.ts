import express from "express";
import path from "path";
import cors from "cors";
import { json } from "body-parser";
import { findOrCreateContact } from "./utils/helper";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Use CORS only once and configured properly
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));


app.use(json());
app.use(express.static(path.join(__dirname, "../public")));

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    const response = await findOrCreateContact(email, phoneNumber);
    res.status(200).json(response);
  } catch (err) {
    console.error("Error in /identify:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
