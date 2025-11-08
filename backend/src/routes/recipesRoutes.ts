import { Router } from "express";
import * as recipeCtrl from "../controllers/recipesController";
import { isAuthenticated } from "../middlewares/auth";

const router = Router();

router.get('/search', isAuthenticated, recipeCtrl.searchRecipes);
router.get('/saved', isAuthenticated, recipeCtrl.getSavedRecipes);
router.get('/:id', isAuthenticated, recipeCtrl.getRecipe);
router.post('/:id/save', isAuthenticated, recipeCtrl.saveRecipe);
router.delete('/:id/save', isAuthenticated, recipeCtrl.deleteSavedRecipe);
router.post('/:id/reviews', isAuthenticated, recipeCtrl.postReview);
router.get('/:id/reviews', isAuthenticated, recipeCtrl.getReviews);
export default router;