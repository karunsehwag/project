import express from "express";
import path from "path";
import cors from "cors";
import { json } from "body-parser";
import { findOrCreateContact } from "./utils/helper";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow requests from your frontend domain
app.use(cors()); // allow all origins (no credentials)


app.use(json());
app.use(express.static(path.join(__dirname, "../public"))); // Serve index.html

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
