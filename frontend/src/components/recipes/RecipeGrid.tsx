"use client";

import { Recipe } from "@/types";
import RecipeCard from "./RecipeCard";
import { Loader2 } from "lucide-react";

interface RecipeGridProps {
  recipes: Recipe[];
  isLoading?: boolean;
  hasSearched: boolean;
  onSaveToggle?: () => void;
}

export default function RecipeGrid({
  recipes,
  isLoading,
  hasSearched,
  onSaveToggle,
}: RecipeGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-12 h-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {hasSearched ? (
          <div>
            <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search filters or search for something else
            </p>
          </div>
        ) : (
          <h3 className="text-lg font-semibold mb-2">
            Search something to get started!
          </h3>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onSaveToggle={onSaveToggle}
        />
      ))}
    </div>
  );
}
