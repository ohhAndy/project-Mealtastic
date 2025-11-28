import { Request, Response, NextFunction } from "express";
import validator from 'validator';

export function sanitizeName(req: Request, res: Response, next: NextFunction) {
    req.body.name = validator.escape(req.body.name);
    next();
}

export function checkEmail(req: Request, res: Response, next: NextFunction) {
    if (!validator.isEmail(req.body.email)) return res.status(400).end("bad input");
    next();
}

export function sanitizeContent(req: Request, res: Response, next: NextFunction) {
    req.body.content = validator.escape(req.body.content);
    next();
}

export function checkSearchQuery(req: Request, res: Response, next: NextFunction) {
    if (!("query" in req.query)) return res.status(400).end("missing query");
    if ("cuisine" in req.query && (req.query.cuisine)) {
        if (!validator.isAlpha(req.query.cuisine as string)) return res.status(400).end("bad cuisine query");
    }
    if ("diet" in req.query && (req.query.diet)) {
        if (!validator.isAlpha(req.query.diet as string)) return res.status(400).end("bad diet query");
    }
    if ("maxPrepTime" in req.query && (req.query.maxPrepTime)) {
        if (!validator.isNumeric(req.query.maxPrepTime as string)) return res.status(400).end("bad maxPrepTime query");
    }
    next();
}

export function checkId(req: Request, res: Response, next: NextFunction) {
    if (!validator.isNumeric(req.params.id) && !validator.isUUID(req.params.id)) return res.status(400).end("bad id param");
    next();
}

export function checkPage(req: Request, res: Response, next: NextFunction){
    if ("page" in req.query && (req.query.page)) {
        if (!validator.isNumeric(req.query.page as string)) return res.status(400).end("bad page query");
    }
    next();
}

export function checkLimit(req: Request, res: Response, next: NextFunction){
    if ("limit" in req.query && (req.query.limit)) {
        if (!validator.isNumeric(req.query.limit as string)) return res.status(400).end("bad limit query");
    }
    next();
}

export function checkRating(req: Request, res: Response, next: NextFunction){
    if (!("rating" in req.body)) return res.status(400).end("missing rating in body");
    if (!validator.isNumeric(req.body.rating)) return res.status(400).end("bad rating");
    next();
}

export function sanitizeComment(req: Request, res: Response, next: NextFunction) {
    req.body.comment = validator.escape(req.body.comment);
    next();
}

export function checkPreferences(req: Request, res: Response, next: NextFunction){
    if ("minCalories" in req.body && (req.body.minCalories)) {
        if (!validator.isNumeric(req.body.minCalories as string)) return res.status(400).end("bad minCalories body");
    }
    if ("maxCalories" in req.body && (req.body.maxCalories)) {
        if (!validator.isNumeric(req.body.maxCalories as string)) return res.status(400).end("bad maxCalories body");
    }
    if ("excludeIngredients" in req.body && (req.body.excludeIngredients)) {
        if (!validator.isAlpha((req.body.excludeIngredients as string).replace(",", ""))) return res.status(400).end("bad excludeIngredients body");
    }
    next();
}

export function checkRoomId(req: Request, res: Response, next: NextFunction) {
    if (!validator.isUUID(req.params.roomId)) return res.status(400).end("bad roomId param");
    next();
}

export function checkPeerId(req: Request, res: Response, next: NextFunction) {
    if (!validator.isUUID(req.params.peerId)) return res.status(400).end("bad peerId param");
    next();
}

export function checkFrom(req: Request, res: Response, next: NextFunction) {
    if (!validator.isUUID(req.body.from)) return res.status(400).end("bad from input");
    next();
}

export function checkTo(req: Request, res: Response, next: NextFunction) {
    if (("to" in req.body) && (req.body.to) && !validator.isUUID(req.body.to)) return res.status(400).end("bad to input");
    next();
}

export function checkType(req: Request, res: Response, next: NextFunction) {
    if (!validator.isAlpha((req.body.type).replace("-", ""))) return res.status(400).end("bad type input");
    next();
}

export function checkIdUUID(req: Request, res: Response, next: NextFunction) {
    if (!validator.isUUID(req.params.id)) return res.status(400).end("bad id param");
    next();
}

export function checkWeekStart(req: Request, res: Response, next: NextFunction) {
    if (("week_start" in req.query) && (req.query.week_start) && !validator.isDate(req.query.week_start as string)) return res.status(400).end("bad week_start query");
    next();
}

export function checkRecipeId(req: Request, res: Response, next: NextFunction) {
    if (req.body.recipe_id && !validator.isNumeric(req.body.recipe_id) && !validator.isUUID(req.body.recipe_id)) return res.status(400).end("bad recipe_id input");
    next();
}

export function checkPlanId(req: Request, res: Response, next: NextFunction) {
    if (!validator.isUUID(req.params.plan_id)) return res.status(400).end("bad plan_id param");
    next();
}

export function checkQueryPlanId(req: Request, res: Response, next: NextFunction) {
    if (("plan_id" in req.query) && (req.query.plan_id) && !validator.isUUID(req.query.plan_id as string)) return res.status(400).end("bad plan_id query");
    next();
}

export function checkQuantity(req: Request, res: Response, next: NextFunction) {
    if (("quantity" in req.body) && (req.body.quantity !== undefined) && (typeof req.body.quantity !== "number")) return res.status(400).end("bad quantity input");
    next();
}