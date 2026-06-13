import LocalStrategy from "passport-local";
import { getUser, getUserById } from "./dao.js";

function configurePassport(passport) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await getUser(username, password);

        if (!user) {
          return done(null, false, {
            message: "Incorrect username or password"
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: "Not authenticated" });
}

export { configurePassport, isLoggedIn };
