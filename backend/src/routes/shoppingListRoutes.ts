import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth";
import * as shoppingListCtrl from "../controllers/shoppingListController";

const router = Router();

// POST /api/shopping-list/generate
router.post("/generate/:plan_id", isAuthenticated, shoppingListCtrl.generateShoppingList);

// GET /api/shopping-list/:plan_id
router.get("/:plan_id", isAuthenticated, shoppingListCtrl.getShoppingList);

// GET /api/shopping-list
router.get("/", isAuthenticated, shoppingListCtrl.getShoppingLists);

// PATCH /api/shopping-list/item/:id
router.patch("/item/:id", isAuthenticated, shoppingListCtrl.updateShoppingItem);

// DELETE /api/shopping-list/:id
router.delete("/:id", isAuthenticated, shoppingListCtrl.deleteShoppingList);

// DELETE /api/shopping-list/item/:id
router.delete("/item/:id", isAuthenticated, shoppingListCtrl.deleteShoppingItem);

export default router;
