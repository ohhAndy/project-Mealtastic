import { Router } from "express";
import * as recipeCtrl from "../controllers/recipesController";
import { isAuthenticated } from "../middlewares/auth";
import { checkSearchQuery, checkId, checkPage, checkLimit, checkRating, sanitizeComment } from "../middlewares/validate";

const router = Router();

router.post('/', isAuthenticated, recipeCtrl.createRecipe);
router.get('/search', isAuthenticated, checkSearchQuery, checkPage, checkLimit, recipeCtrl.searchRecipes);
router.get('/saved', isAuthenticated, checkPage, checkLimit, recipeCtrl.getSavedRecipes);
router.get('/:id', isAuthenticated, checkId, recipeCtrl.getRecipe);
router.post('/:id/save', isAuthenticated, checkId, recipeCtrl.saveRecipe);
router.delete('/:id/save', isAuthenticated, checkId, recipeCtrl.deleteSavedRecipe);
router.put('/:id/reviews', isAuthenticated, checkId, checkRating, sanitizeComment, recipeCtrl.upsertReview);
router.get('/:id/reviews', isAuthenticated, checkId, checkPage, checkLimit, recipeCtrl.getReviews);
router.delete('/:id/reviews/:reviewId', isAuthenticated, checkId, recipeCtrl.deleteReview);
router.get('/:id/reviews/count', isAuthenticated, checkId, recipeCtrl.getReviewCount);
router.get('/:id/reviews/user', isAuthenticated, checkId, recipeCtrl.getUserReview);
export default router;