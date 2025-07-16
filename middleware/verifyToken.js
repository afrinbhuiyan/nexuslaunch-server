const admin = require('../firebase/firebase.config');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log('Received headers:', req.headers); // Debug log
  // console.log('Auth header:', authHeader); // Debug log
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decodedUser = await admin.auth().verifyIdToken(token);
    req.user = decodedUser;
    next();
  } catch (error) {
    // console.error('Token verification error:', error);
    return res.status(403).send({ message: 'Forbidden Access' });
  }
};

module.exports = verifyToken;
