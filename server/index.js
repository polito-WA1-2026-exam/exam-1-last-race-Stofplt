import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { configurePassport, isLoggedIn } from "./auth.js";

const app = express();
const port = process.env.PORT || 3001;

configurePassport(passport);

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);
app.use(
  session({
    secret: "last-race-development-secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.authenticate("session"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "last-race-api" });
});

app.post("/api/sessions", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.status(201).json(req.user);
    });
  })(req, res, next);
});

app.get("/api/sessions/current", isLoggedIn, (req, res) => {
  res.json(req.user);
});

app.delete("/api/sessions/current", isLoggedIn, (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Last Race API listening at http://localhost:${port}`);
});
