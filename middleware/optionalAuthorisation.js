import jwt from 'jsonwebtoken';

const optionalAuthorisation = (req, res, next) => {
  if (!('authorization' in req.headers) || !req.headers.authorization.match(/^Bearer /)) {
    req.user = "";
    next();
  }
  else{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
      res.status(401).json({ error: true, message: "Token Missing" });
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err){
        req.user = decoded;
        next();
      }
      else if (err.name === 'TokenExpiredError') {
        res.status(401).json({ error: true, message: 'JWT token has expired' });
        return;
      }
      else if (err){
        res.status(401).json({ error: true, message: 'Invalid JWT token' });
        return;
      }
    });
  }
};

export default optionalAuthorisation;