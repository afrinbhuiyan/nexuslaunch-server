module.exports = (requiredRole) => {
  return async (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || userRole !== requiredRole) {
      return res.status(403).json({ message: "Forbidden: Insufficient Role" });
    }

    next();
  };
};
