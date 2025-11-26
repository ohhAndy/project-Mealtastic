import { useState, useCallback, useEffect } from "react";
import { Recipe, RecipeSearchParams, Review } from "@/types";
import { toast } from "sonner";
import {
  deleteReviewAPI,
  getRecipeByIdAPI,
  getReviewCountAPI,
  getReviewsAPI,
  getSavedRecipesAPI,
  getUserReviewAPI,
  saveRecipeAPI,
  searchRecipesAPI,
  unsaveRecipeAPI,
  upsertReviewAPI,
} from "../api/recipes";

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [totalResults, setTotalResults] = useState<number>(0);

  const [reviews, setReviews] = useState<Review[]>([]); 
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [totalReviewCount, setTotalReviewCount] = useState(0);

  // Load saved recipe IDs on mount
  useEffect(() => {
    const loadSavedIds = async () => {
      try {
        const data = await getSavedRecipesAPI({ page: 0, limit: 1000 });
        const ids = new Set<string>(data.map((recipe: Recipe) => recipe.id));
        setSavedRecipeIds(ids);
      } catch (err) {
        // Silently fail - user might not be logged in yet
      }
    };
    loadSavedIds();
  }, []);

  const searchRecipes = useCallback(async (params: RecipeSearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchRecipesAPI(params);

      if (Array.isArray(data)) {
        // Fallback if API returns just an array
        setRecipes(data);
        setTotalResults(data.length); 
      } else if (data && (data.results)) {
        // Handle paginated response object
        setRecipes(data.results || []);
        setTotalResults(data.totalResults || 0);
      } else {
        setRecipes([]);
        setTotalResults(0);
      }
      return data;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to search recipes";
      setError(errorMsg);
      toast.error("Error", {
        description: errorMsg,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecipeById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecipeByIdAPI(id);
      return data;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch recipe";
      setError(errorMsg);
      toast.error("Error", {
        description: errorMsg,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isRecipeSaved = (id: string) => {
    return savedRecipeIds.has(id);
  };

  const saveRecipe = useCallback(async (id: string) => {
    try {
      await saveRecipeAPI(id);
      setSavedRecipeIds((prev) => new Set([...prev, id]));
      toast.success("Recipe saved", {
        description: "Recipe added to your saved recipes.",
      });
      return true;
    } catch (err) {
      toast.error("Error", {
        description:
          err instanceof Error ? err.message : "Failed to save recipe",
      });
      return false;
    }
  }, []);

  const unsaveRecipe = useCallback(async (id: string) => {
    try {
      await unsaveRecipeAPI(id);
      setSavedRecipeIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      toast.success("Recipe removed", {
        description: "Recipe removed from your saved recipes.",
      });
      return true;
    } catch (err) {
      toast.error("Error", {
        description:
          err instanceof Error ? err.message : "Failed to remove recipe",
      });
      return false;
    }
  }, []);

  const getSavedRecipes = useCallback(
    async (params?: { page?: number; limit?: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSavedRecipesAPI(params);
        setRecipes(Array.isArray(data) ? data : []);
        return data;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch saved recipes";
        setError(errorMsg);
        toast.error("Error", {
          description: errorMsg,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchUserReview = useCallback(async (recipeId: string) => {
    try {
      const data = await getUserReviewAPI(recipeId);
      setUserReview(data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const fetchReviewCount = useCallback(async (recipeId: string) => {
    try {
      const data = await getReviewCountAPI(recipeId);
      setTotalReviewCount(data.count);
      return data.count;
    } catch (err) {
      console.error(err);
      return 0;
    }
  }, []);

  // Updated to use Review[] type
  const fetchReviews = useCallback(async (recipeId: string, page: number, limit: number, currentUserId?: string) => {
    try {
      // Ensure getReviewsAPI in api/recipes.ts is also typed to return Promise<Review[]>
      // If it returns 'any', we cast it here, but ideally update that file too.
      const data = await getReviewsAPI(recipeId, { page, limit }) as Review[];
      
      const filtered = currentUserId 
        ? data.filter((r) => r.user_id !== currentUserId)
        : data;
      
      setReviews(filtered);
      return filtered;
    } catch (err) {
      toast.error("Failed to load reviews");
      setReviews([]);
      return [];
    }
  }, []);

  const submitReview = useCallback(async (recipeId: string, rating: number, comment: string) => {
    try {
      await upsertReviewAPI(recipeId, { 
        rating: rating.toString(), 
        comment: comment.trim() || "" 
      });
      
      toast.success("Review submitted!");
      await fetchUserReview(recipeId);
      await fetchReviewCount(recipeId);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      toast.error("Error", { description: msg });
      return false;
    }
  }, [fetchUserReview, fetchReviewCount]);

  const removeReview = useCallback(async (recipeId: string, reviewId: string) => {
    try {
      await deleteReviewAPI(recipeId, reviewId);
      toast.success("Review deleted");
      setUserReview(null);
      await fetchReviewCount(recipeId);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete review";
      toast.error("Error", { description: msg });
      return false;
    }
  }, [fetchReviewCount]);

  return {
    recipes,
    isLoading,
    error,
    reviews,          
    userReview,       
    totalReviewCount,
    searchRecipes,
    getRecipeById,
    isRecipeSaved,
    saveRecipe,
    unsaveRecipe,
    getSavedRecipes,
    fetchReviews, 
    fetchUserReview, 
    fetchReviewCount, 
    submitReview, 
    removeReview,
    totalResults,
  };
}
