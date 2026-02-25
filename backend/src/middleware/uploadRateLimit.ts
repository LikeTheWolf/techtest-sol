import rateLimit from "express-rate-limit";

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: "Too many upload requests. Please try again later." }
});