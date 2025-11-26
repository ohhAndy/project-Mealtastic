'use client'

import RecipeGrid from "@/components/recipes/RecipeGrid";
import RecipeSearchBar from "@/components/recipes/RecipeSearchBar";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { RecipeSearchParams } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ITEMS_PER_PAGE = 20;

export default function RecipesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const { recipes, isLoading, searchRecipes, totalResults } = useRecipes();
  const [hasSearched, setHasSearched] = useState(false);

  const [currPage, setCurrPage] = useState(0);

  const [currParams, setCurrParams] = useState<RecipeSearchParams>({
    limit: ITEMS_PER_PAGE,
    page: 0
  });

  const handleSearch = async (params: RecipeSearchParams) => {
    if(!hasSearched) setHasSearched(true);

    setCurrPage(0); 
    const newParams = { ...params, page: 0, limit: ITEMS_PER_PAGE };
    setCurrParams(newParams);
    await searchRecipes(newParams);
  };

  const handlePageChange = async (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? currPage + 1 : currPage - 1;
    
    if (newPage < 0) return;

    setCurrPage(newPage);
    
    const newParams = { 
      ...currParams, 
      page: newPage 
    };
    
    setCurrParams(newParams);
    await searchRecipes(newParams);
    
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading || !user) return null;

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

  return (
    <div className="mx-auto px-4 py-8 space-y-2 ">
      <div className="flex justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Discover Recipes</h1>
          <p className="text-muted-foreground">Search thousands of recipes to plan your perfect meals</p>
        </div>
        <Button 
          className="bg-green-800 mr-4" 
          onClick={() => router.push("recipes/create")}
        >
          + Create
        </Button>
      </div>

      <RecipeSearchBar onSearch={handleSearch} isLoading={isLoading}/>

      
      <RecipeGrid
        recipes={recipes}
        isLoading={isLoading}
        hasSearched={hasSearched}
        onSaveToggle={() => router.refresh()}
      />

      {hasSearched && recipes.length > 0 && (
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
