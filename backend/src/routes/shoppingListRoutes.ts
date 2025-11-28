// ramim (who dropped the course) probably used chatgpt for this file initially

import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth";
import * as shoppingListCtrl from "../controllers/shoppingListController";
import { checkChecked, checkId, checkLimit, checkPage, checkPlanId, checkQuantity, checkQueryPlanId } from "../middlewares/validate";

const router = Router();

router.post("/generate", isAuthenticated, checkQueryPlanId, shoppingListCtrl.generateShoppingList);
router.get("/:plan_id", isAuthenticated, checkPlanId, shoppingListCtrl.getShoppingList);
router.get("/", isAuthenticated, checkPage, checkLimit, shoppingListCtrl.getShoppingLists);
router.patch("/item/:id", isAuthenticated, checkId, checkChecked, checkQuantity, shoppingListCtrl.updateShoppingItem);
router.delete("/:id", isAuthenticated, checkId, shoppingListCtrl.deleteShoppingList);
router.delete("/item/:id", isAuthenticated, checkId, shoppingListCtrl.deleteShoppingItem);

export default router;
