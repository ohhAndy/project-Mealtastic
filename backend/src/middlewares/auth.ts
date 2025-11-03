import { Request, Response, NextFunction } from "express";

// Checks whether the user is authenticated using session
export const isAuthenticated = function(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).end("access denied");
  }
  next();
}