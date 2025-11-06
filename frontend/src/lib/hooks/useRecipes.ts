import { useState, useCallback } from 'react';
import { Recipe, RecipeSearchParams } from '@/types';
import { toast } from 'sonner';
import { getRecipeByIdAPI, getReviewsAPI, getSavedRecipesAPI, postReviewAPI, saveRecipeAPI, searchRecipesAPI, unsaveRecipeAPI } from '../api/recipes';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRecipes = useCallback(async (params: RecipeSearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchRecipesAPI(params);

      setRecipes(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to search recipes';
      setError(errorMsg);
      toast.error('Error', {
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
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch recipe';
      setError(errorMsg);
      toast.error('Error', {
        description: errorMsg,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveRecipe = useCallback(async (id: string) => {
    try {
      await saveRecipeAPI(id);
      toast.success('Recipe saved', {
        description: 'Recipe added to your saved recipes.',
      });
      return true;
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to save recipe',
      });
      return false;
    }
  }, []);

  const unsaveRecipe = useCallback(async (id: string) => {
    try {
      await unsaveRecipeAPI(id);
      toast.success('Recipe removed', {
        description: 'Recipe removed from your saved recipes.',
      });
      return true;
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to remove recipe',
      });
      return false;
    }
  }, []);

  const getSavedRecipes = useCallback(async (params?: { page?: number; limit?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSavedRecipesAPI(params);
      setRecipes(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch saved recipes';
      setError(errorMsg);
      toast.error('Error', {
        description: errorMsg,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const postReview = useCallback(async (id: string, rating: number, comment: string) => {
    try {
      await postReviewAPI(id, { rating, comment });
      toast.success('Review posted', {
        description: 'Your review has been added.',
      });
      return true;
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to post review',
      });
      return false;
    }
  }, []);

  const getReviews = useCallback(async (id: string, params?: { page?: number; limit?: number }) => {
    try {
      const data = await getReviewsAPI(id, params);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to fetch reviews',
      });
      return [];
    }
  }, []);

  return {
    recipes,
    isLoading,
    error,
    searchRecipes,
    getRecipeById,
    saveRecipe,
    unsaveRecipe,
    getSavedRecipes,
    postReview,
    getReviews,
  };
}