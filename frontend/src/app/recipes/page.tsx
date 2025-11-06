'use client'

import RecipeGrid from "@/components/recipes/RecipeGrid";
import RecipeSearchBar from "@/components/recipes/RecipeSearchBar";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { RecipeSearchParams } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RecipesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const { recipes, isLoading, searchRecipes } = useRecipes();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (params: RecipeSearchParams) => {
    if(!hasSearched) setHasSearched(true);
    await searchRecipes(params);
  };

  if (authLoading || !user) return null;

  return (
    <div className="mx-auto px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Discover Recipes</h1>
        <p className="text-muted-foreground">Search thousands of recipes to plan your perfect meals</p>
      </div>

      <RecipeSearchBar onSearch={handleSearch} isLoading={isLoading}/>

      
      <RecipeGrid
        recipes={recipes}
        isLoading={isLoading}
        hasSearched={hasSearched}
        onSaveToggle={() => router.refresh()}
      />
    </div>
  );
}
