export const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/?error=no-auth');
    }
    next();
  };