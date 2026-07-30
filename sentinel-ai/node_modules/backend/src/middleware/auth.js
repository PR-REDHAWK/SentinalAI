const jwt = require('jsonwebtoken');

// Authentication middleware scaffold
exports.protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Allow bypass for the MVP frontend which isn't sending tokens yet, or enforce if needed later.
  // For now, it's just a scaffold.
  if (!token) {
    // Optionally we could reject:
    // return res.status(401).json({ success: false, message: 'Not authorized to access this route', errors: [] });
    // But since it's just a scaffold, we'll let it pass for now.
    console.warn("Auth token missing - allowing for MVP phase");
  } else {
    // Scaffold verification
    try {
      // jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route', errors: [] });
    }
  }

  next();
};
