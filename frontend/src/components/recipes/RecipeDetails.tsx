"use client";

import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, ChefHat, Heart, ArrowLeft, Leaf, Box } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRecipes } from "@/lib/hooks/useRecipes";

interface RecipeDetailProps {
  recipe: Recipe;
}

const recipeFractions: Record<string, string> = {
  "0.125": "⅛",
  "0.25": "¼",
  "0.33": "⅓",
  "0.5": "½",
  "0.67": "⅔",
  "0.75": "¾",
};

export default function RecipeDetails({ recipe }: RecipeDetailProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(recipe.persistent || false);
  const [isLoading, setIsLoading] = useState(false);
  const { saveRecipe, unsaveRecipe } = useRecipes();

  const totalTime = recipe.prep_time || 0;
  const servings = recipe.cached_data?.servings;
  const ingredients = recipe.cached_data?.extendedIngredients || [];
  const instructions = recipe.cached_data?.analyzedInstructions;

  const handleSaveToggle = async () => {
    setIsLoading(true);
    try {
      if (isSaved) {
        const success = await unsaveRecipe(recipe.id);
        if(success) {
          setIsSaved(false);
        }
      } else {
        const success = await saveRecipe(recipe.id);
        if(success) {
          setIsSaved(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4 hover:text-blue-800 hover:bg-gray-200"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to recipes
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 font-playfair">{recipe.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.cuisines &&
                recipe.cuisines.map((cuisine) => (
                  <Badge key={cuisine} variant="secondary">
                    {cuisine}
                  </Badge>
                ))}
              {recipe.diets?.map((diet) => (
                <Badge key={diet} variant="outline">
                  {diet}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant={isSaved ? "default" : "outline"}
            onClick={handleSaveToggle}
            disabled={isLoading}
          >
            <Heart
              className={`mr-2 h-4 w-4 ${isSaved ? "fill-current" : ""}`}
            />
            {isSaved ? "Saved" : "Save"}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex justify-between">
          <div className="flex gap-6 text-sm text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{totalTime} minutes</span>
              </div>
            )}
            {servings && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{servings} servings</span>
              </div>
            )}
            {!!recipe.rating && recipe.rating > 0 && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                <span>Rating: {recipe.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          {/* Source Link */}
          {recipe.source && (
            <div className="">
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View original recipe →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Image */}
      {recipe.image_url && (
        <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8">
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Ingredients */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
              <ul className="space-y-2">
                {ingredients.map(
                  (
                    ingredient: { name: string; amount: number; unit: string },
                    index: number
                  ) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm">
                        {`${ingredient.amount > 0 && ingredient.amount < 1 ? recipeFractions[ingredient.amount.toString()] : ingredient.amount} ${ingredient.unit} ${ingredient.name}`}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Instructions</h2>

              {instructions && instructions.length > 0 ? (
                instructions.map((instruction, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* Optional instruction name */}
                    {instruction.name && (
                      <h3 className="text-lg font-medium" >
                        {instruction.name}
                      </h3>
                    )}

                    {/* Steps */}
                    {instruction.steps && instruction.steps.length > 0 ? (
                      <ol className="list-decimal list-inside space-y-5">
                        {instruction.steps.map((step) => (
                          <li key={step.number} className="space-y-1">
                            <p className="text-black mb-2">{step.step}</p>

                            {/* Ingredients */}
                            {step.ingredients &&
                              step.ingredients.length > 0 && (
                                <p className="text-sm text-gray-600 flex gap-2 items-center ml-4">
                                  <Leaf height={16} width={16}></Leaf>
                                  <span className="italic">Ingredients:</span>{" "}
                                  {step.ingredients
                                    .map((ing) => ing.name)
                                    .join(", ")}
                                </p>
                              )}

                            {/* Equipment */}
                            {step.equipment && step.equipment.length > 0 && (
                              <p className="text-sm text-gray-600 flex gap-2 items-center ml-4">
                                <Box height={16} width={16}></Box>
                                <span className="italic">Equipment:</span>{" "}
                                {step.equipment.map((eq) => eq.name).join(", ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-muted-foreground">
                        No steps available
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No instructions available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
