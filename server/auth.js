function configurePassport() {}

function isLoggedIn(req, res, next) {
  return next();
}

export { configurePassport, isLoggedIn };