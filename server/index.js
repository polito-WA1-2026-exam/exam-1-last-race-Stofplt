import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "last-race-api" });
});

app.listen(port, () => {
  console.log(`Last Race API listening at http://localhost:${port}`);
});
