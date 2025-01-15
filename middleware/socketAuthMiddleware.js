const jwt = require('jsonwebtoken');

exports.socketAuthMiddleware = (socket,next) =>{

    const token = socket.handshake.headers['authorization'];
    console.log("token:",token);
    if (!token) {
      console.error("Authentication error: Token not provided");
      return next(new Error('Authentication error: Token not provided'));    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        socket.user = decoded;
        console.log("Token verified successfully. User:", decoded);
        next()
      } catch (err) {
        console.error("Authentication error:", err.message);
        // Pass the error to the next middleware
        next(new Error('Authentication error: Invalid or expired token'));
      }
}