'use client'

import RecipeSearchBar from "@/components/recipes/RecipeSearchBar";

export default function RecipesPage() {



  return (
    <div className="mx-auto px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Discover Recipes</h1>
        <p className="text-muted-foreground">Search tousands of recipes to plan your perfect meals</p>
      </div>

      <RecipeSearchBar />

      
    </div>
  );
}
