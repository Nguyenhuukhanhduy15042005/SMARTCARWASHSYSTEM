/**
 * Middleware kiểm tra role người dùng.
 * Dùng sau authMiddleware.
 *
 * Ví dụ: router.delete('/:id', authMiddleware, requireRole('admin'), handler)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Bạn không có quyền thực hiện hành động này. Yêu cầu role: ${roles.join(' hoặc ')}.`,
      });
    }

    next();
  };
};

module.exports = requireRole;
