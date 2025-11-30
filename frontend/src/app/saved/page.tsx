//basically replicated what was done in the recipe search pages, using a recipe grid and cards to display the recipes, but with different API calls, no AI was used

"use client";

import RecipeGrid from "@/components/recipes/RecipeGrid";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS_PER_PAGE = 20;

export default function SavedRecipesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const { recipes, isLoading, getSavedRecipes, totalResults } = useRecipes();


  const [currPage, setCurrPage] = useState(0);
  const [currParams, setCurrParams] = useState({ 
    limit: ITEMS_PER_PAGE, 
    page: 0,
  })

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

  const handlePageChange = async (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? currPage + 1 : currPage - 1;
    
    if (newPage < 0) return;

    setCurrPage(newPage);
    
    const newParams = { 
      ...currParams, 
      page: newPage 
    };
    
    setCurrParams(newParams);
    await getSavedRecipes(newParams);
    
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

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

      {recipes.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-8 border-t mt-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange('prev')}
              disabled={currPage === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <span className="text-sm font-medium text-muted-foreground">
              Page {currPage + 1} {totalPages > 0 && `of ${totalPages}`}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange('next')}
              disabled={(totalPages > 0 && currPage >= totalPages - 1) || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {totalResults} matching recipes found
          </div>
        </div>
      )}
    </div>
  );
}
