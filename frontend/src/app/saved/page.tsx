"use client";

import RecipeGrid from "@/components/recipes/RecipeGrid";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SavedRecipesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const { recipes, isLoading, getSavedRecipes } = useRecipes();

  useEffect(() => {
    async function loadSavedRecipes() {
      try {
        await getSavedRecipes();
      } catch (err) {
        console.error(err);
      }
    }
    loadSavedRecipes();
  }, []);

  if (authLoading || !user) return null;

  return (
    <div className="mx-auto px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Your Saved Recipes</h1>
        <p className="text-muted-foreground">
          A collection of your saved recipes
        </p>
      </div>

      <RecipeGrid
        recipes={recipes}
        isLoading={isLoading}
        hasSearched={true}
        onSaveToggle={() => router.refresh()}
      />
    </div>
  );
}
