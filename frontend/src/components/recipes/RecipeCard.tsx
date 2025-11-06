// components/recipes/RecipeCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRecipes } from '@/lib/hooks/useRecipes';

interface RecipeCardProps {
  recipe: Recipe;
  onSaveToggle?: () => void;
}

export default function RecipeCard({ recipe, onSaveToggle }: RecipeCardProps) {
  const [isSaved, setIsSaved] = useState(/*recipe.isSaved ||*/ false);
  const [isLoading, setIsLoading] = useState(false);
  const { saveRecipe, unsaveRecipe } = useRecipes();
    
  const totalTime = recipe.prep_time || 0;

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSaved) {
        saveRecipe(recipe.id);
        setIsSaved(false);
        toast.success('Recipe removed', {
          description: 'Recipe removed from your saved recipes.',
        });
      } else {
        unsaveRecipe(recipe.id);
        setIsSaved(true);
        toast.success('Recipe saved', {
          description: 'Recipe added to your saved recipes.',
        });
      }
      onSaveToggle?.();
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to update recipe. Please try again.',
      });
      console.error("Failed to save", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative h-48 w-full bg-gray-200">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 rounded-full ${
              isSaved ? 'bg-red-500 hover:bg-red-600' : 'bg-white/80 hover:bg-white'
            }`}
            onClick={handleSaveToggle}
            disabled={isLoading}
          >
            <Heart
              className={`h-5 w-5 ${isSaved ? 'fill-white text-white' : 'text-gray-700'}`}
            />
          </Button>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.title}</h3>
          
          <div className="flex gap-4 text-sm text-muted-foreground mb-3">
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{totalTime} min</span>
              </div>
            )}
            {recipe.cached_data?.servings && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{recipe.cached_data.servings} servings</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {recipe.cuisines && recipe.cuisines.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recipe.cuisines[0]}
              </Badge>
            )}
            {recipe.diets?.slice(0, 2).map((diet) => (
              <Badge key={diet} variant="outline" className="text-xs">
                {diet}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}