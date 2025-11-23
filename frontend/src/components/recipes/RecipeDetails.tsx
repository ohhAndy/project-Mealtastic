"use client";

import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Users,
  ChefHat,
  Heart,
  ArrowLeft,
  Leaf,
  Box,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRecipes } from "@/lib/hooks/useRecipes";
import { Textarea } from "../ui/textarea";

interface RecipeDetailProps {
  recipe: Recipe;
  userId: string;
}

interface Review {
  id: string;
  user_id: string;
  recipe_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string;
}

const recipeFractions: Record<string, string> = {
  "0.125": "⅛",
  "0.25": "¼",
  "0.33": "⅓",
  "0.5": "½",
  "0.67": "⅔",
  "0.75": "¾",
};

export default function RecipeDetails({ recipe, userId }: RecipeDetailProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(recipe.persistent || false);
  const [isLoading, setIsLoading] = useState(false);
  const { saveRecipe, unsaveRecipe } = useRecipes();

  const totalTime = recipe.prep_time || 0;
  const servings = recipe.cached_data?.servings;
  const ingredients = recipe.cached_data?.extendedIngredients || [];
  const instructions = recipe.cached_data?.analyzedInstructions;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const response = await fetch(`/api/recipes/${recipe.id}/reviews`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          // Backend returns array directly, not { reviews: [...] }
          setReviews(data || []);
          const userRev = data?.find((r: Review) => r.user_id === userId);
          if (userRev) {
            setUserReview(userRev);
            setNewRating(userRev.rating);
            setNewComment(userRev.comment || "");
          }
        }
      } catch (error) {
        console.error("Failed to load reviews:", error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    loadReviews();
  }, [recipe.id, userId]);

  const handleSaveToggle = async () => {
    setIsLoading(true);
    try {
      if (isSaved) {
        const success = await unsaveRecipe(recipe.id);
        if (success) {
          setIsSaved(false);
        }
      } else {
        const success = await saveRecipe(recipe.id);
        if (success) {
          setIsSaved(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (newRating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          rating: newRating.toString(),
          comment: newComment.trim() || null,
        }),
      });

      if (response.ok) {
        // Backend returns 200 with no body, so reload reviews
        const reviewsResponse = await fetch(
          `/api/recipes/${recipe.id}/reviews`,
          {
            credentials: "include",
          }
        );
        console.log(reviewsResponse);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData || []);
          const userRev = reviewsData?.find(
            (r: Review) => r.user_id === userId
          );
          if (userRev) {
            setUserReview(userRev);
          }
        }
      } else {
        const error = await response.text();
        alert(`Failed to submit review: ${error}`);
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (
      !userReview ||
      !confirm("Are you sure you want to delete your review?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/recipes/${recipe.id}/reviews/${userReview.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        setUserReview(null);
        setNewRating(0);
        setNewComment("");
        setReviews(reviews.filter((r) => r.id !== userReview.id));
      } else {
        const error = await response.text();
        alert(`Failed to delete review: ${error}`);
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Failed to delete review");
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

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
            <h1 className="text-3xl font-bold mb-2 font-playfair">
              {recipe.title}
            </h1>
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
                        {`${
                          ingredient.amount > 0 && ingredient.amount < 1
                            ? recipeFractions[ingredient.amount.toString()]
                            : ingredient.amount
                        } ${ingredient.unit} ${ingredient.name}`}
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
                      <h3 className="text-lg font-medium">
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
                                  <span className="italic">
                                    Ingredients:
                                  </span>{" "}
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

      {/* Reviews Section */}
      <div className="mt-8 space-y-6">
        {/* Add/Edit Review */}
        <Card>
          <CardHeader>
            <CardTitle>
              {userReview ? "Your Review" : "Write a Review"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Star Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredStar || newRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comment (optional)
              </label>
              <Textarea
                placeholder="Share your thoughts about this recipe..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || newRating === 0}
              >
                {isSubmittingReview
                  ? "Submitting..."
                  : userReview
                  ? "Update Review"
                  : "Submit Review"}
              </Button>
              {userReview && (
                <Button variant="destructive" onClick={handleDeleteReview}>
                  Delete Review
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingReviews ? (
              <p className="text-muted-foreground">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-muted-foreground">
                No reviews yet. Be the first to review!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews
                  .filter((review) => review.id !== userReview?.id)
                  .map((review) => (
                    <div
                      key={review.id}
                      className="border-b pb-4 last:border-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
