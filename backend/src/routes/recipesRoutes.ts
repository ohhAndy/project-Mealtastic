import { Router } from "express";
import * as recipeCtrl from "../controllers/recipesController";
import { isAuthenticated } from "../middlewares/auth";
import { checkSearchQuery, checkId, checkPage, checkLimit, checkRating, sanitizeComment } from "../middlewares/validate";

const router = Router();

router.get('/search', isAuthenticated, checkSearchQuery, checkPage, checkLimit, recipeCtrl.searchRecipes);
router.get('/saved', isAuthenticated, checkPage, checkLimit, recipeCtrl.getSavedRecipes);
router.get('/:id', isAuthenticated, checkId, recipeCtrl.getRecipe);
router.post('/:id/save', isAuthenticated, checkId, recipeCtrl.saveRecipe);
router.delete('/:id/save', isAuthenticated, checkId, recipeCtrl.deleteSavedRecipe);
router.post('/:id/reviews', isAuthenticated, checkId, checkRating, sanitizeComment, recipeCtrl.postReview);
router.get('/:id/reviews', isAuthenticated, checkId, checkPage, checkLimit, recipeCtrl.getReviews);
export default router;