import { Request, Response, NextFunction } from "express";
import validator from 'validator';

export const sanitizeName = function(req: Request, res: Response, next: NextFunction) {
    req.body.name = validator.escape(req.body.name);
    next();
};

export const checkEmail = function(req: Request, res: Response, next: NextFunction) {
    if (!validator.isEmail(req.body.email)) return res.status(400).end("bad input");
    next();
};

export const sanitizeContent = function(req: Request, res: Response, next: NextFunction) {
    req.body.content = validator.escape(req.body.content);
    next();
}