import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth";
import * as shoppingListCtrl from "../controllers/shoppingListController";

const router = Router();

// POST /api/shopping-list/generate
router.post("/generate", isAuthenticated, shoppingListCtrl.generateShoppingList);

// GET /api/shopping-list
router.get("/", isAuthenticated, shoppingListCtrl.getShoppingList);

// PATCH /api/shopping-list/item/:id
router.patch("/item/:id", isAuthenticated, shoppingListCtrl.updateShoppingItem);

// DELETE /api/shopping-list/:id
router.delete("/:id", isAuthenticated, shoppingListCtrl.deleteShoppingList);

export default router;
