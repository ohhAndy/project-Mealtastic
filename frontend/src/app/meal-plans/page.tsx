"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  Plus,
  X,
  Search,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

type MealType = (typeof MEAL_TYPES)[number];

interface MealEntry {
  id: number;
  plan_id: number;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  title?: string;
  image_url?: string;
}

interface MealPlan {
  week_start: string;
  entries: MealEntry[];
}

interface Recipe {
  id: number;
  title: string;
  image_url?: string;
  ready_in_minutes?: number;
}

interface SelectedEntry {
  id: number | null;
  date: string;
  meal_type: MealType;
  plan_id?: number;
}

export default function MealPlannerPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  useEffect(() => {
    setCurrentWeekStart(getWeekStart(new Date()));
  }, []);

  useEffect(() => {
    fetchMealPlan(currentWeekStart);
  }, [currentWeekStart]);

  function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon ...
    const diff = d.getDate() - ((day + 6) % 7);
    d.setDate(diff);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayOfMonth}`;
  }

  function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day); // construct local date
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  }

  function addDays(dateStr: string | null, days: number): string {
    if(!dateStr) return "";
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  function navigateWeek(direction: number): void {
    const newWeekStart = addDays(currentWeekStart, direction * 7);
    setCurrentWeekStart(newWeekStart);
  }

  function isCurrentWeek(): boolean {
    return currentWeekStart === getWeekStart(new Date());
  }

  async function fetchMealPlan(weekStart: string | null): Promise<void> {
    if(!weekStart) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meal-planner?week_start=${weekStart}`, {
        method: "GET",
        credentials: "include",
      });
      if (res.status === 404) {
        setMealPlan(null);
      } else if (res.ok) {
        const data: MealPlan = await res.json();
        console.log(data);
        setMealPlan(data);
      } else {
        throw new Error("Failed to fetch meal plan");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function generateMealPlan(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meal-planner/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate meal plan");
      }
      await fetchMealPlan(currentWeekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMealPlan(): Promise<void> {
    if (!mealPlan || !confirm("Delete this entire meal plan?")) return;
    setLoading(true);
    try {
      const planId = mealPlan.entries[0]?.plan_id;
      await fetch(`/api/meal-planner/${planId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setMealPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function updateMealEntry(
    entryId: number,
    recipeId: number | null
  ): Promise<void> {
    try {
      await fetch(`/api/meal-planner/entries/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId }),
        credentials: "include",
      });
      await fetchMealPlan(currentWeekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function removeMeal(entryId: number): Promise<void> {
    await updateMealEntry(entryId, null);
  }

  async function searchRecipes(query: string): Promise<void> {
    setSearching(true);
    try {
      const res = await fetch(`/api/recipes/search?query=${query}`, {
        method: "GET",
        credentials: "include",
      });
      const data: { recipes?: Recipe[] } = await res.json();
      setSearchResults(data.recipes || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }

  function openSwapModal(entry: MealEntry): void {
    setSelectedEntry({
      id: entry.id,
      date: entry.date,
      meal_type: entry.meal_type,
      plan_id: entry.plan_id,
    });
    setSwapModalOpen(true);
    setSearchQuery("");
    searchRecipes("");
  }

  function openAddModal(date: string, mealType: MealType): void {
    const entry: SelectedEntry = { date, meal_type: mealType, id: null };
    setSelectedEntry(entry);
    setSwapModalOpen(true);
    setSearchQuery("");
    searchRecipes("");
  }

  async function selectRecipe(recipeId: number): Promise<void> {
    if (selectedEntry?.id) {
      await updateMealEntry(selectedEntry.id, recipeId);
    }
    setSwapModalOpen(false);
  }

  function getMealEntry(date: string, mealType: MealType): MealEntry | null {
    if (!mealPlan?.entries) return null;
    return (
      mealPlan.entries.find(
        (e) => e.date === date && e.meal_type === mealType
      ) || null
    );
  }

  function getWeekDates(): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Weekly Meal Plan
          </h1>
          <p className="text-slate-600">Plan your meals for the week ahead</p>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek(-1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Week
          </Button>

          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-green-700" />
            <span className="font-semibold text-lg">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </span>
            {!isCurrentWeek() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
              >
                Back to Current Week
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek(1)}
            className="flex items-center gap-2"
          >
            Next Week
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </Button>
        </div>

        {/* Actions */}
        {isCurrentWeek() && (
          <div className="mb-6 flex gap-3">
            {!mealPlan && (
              <Button
                onClick={generateMealPlan}
                disabled={loading}
                className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Generate Meal Plan
              </Button>
            )}
            {mealPlan && (
              <>
                <Button
                  onClick={generateMealPlan}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Plan
                </Button>
                <Button
                  onClick={deleteMealPlan}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Plan
                </Button>
              </>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !mealPlan && isCurrentWeek() && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No Meal Plan Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Generate your first weekly meal plan to get started
            </p>
            <Button
              onClick={generateMealPlan}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              Generate Meal Plan
            </Button>
          </div>
        )}

        {!loading && !mealPlan && !isCurrentWeek() && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No Meal Plan for This Week
            </h3>
            <p className="text-slate-600">
              This week doesn&apos;t have a meal plan yet
            </p>
          </div>
        )}

        {/* Meal Plan Grid */}
        {!loading && mealPlan && (
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, dayIndex) => (
              <div key={date} className="space-y-3">
                <div className="text-center pb-2 border-b-2 border-green-700">
                  <div className="font-semibold text-slate-900">
                    {DAYS[dayIndex]}
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDate(date)}
                  </div>
                </div>

                {MEAL_TYPES.map((mealType) => {
                  const entry = getMealEntry(date, mealType);
                  const hasRecipe = entry && entry.recipe_id;

                  return (
                    <div
                      key={mealType}
                      className="bg-white rounded-lg shadow-sm overflow-hidden"
                    >
                      <div className="bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 uppercase">
                        {mealType}
                      </div>

                      {hasRecipe ? (
                        <div className="p-3">
                          {entry.image_url && (
                            <img
                              src={entry.image_url}
                              alt={entry.title}
                              className="w-full h-24 object-cover rounded mb-2"
                            />
                          )}
                          <h4 className="font-medium text-sm text-slate-900 mb-2 line-clamp-2">
                            {entry.title}
                          </h4>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSwapModal(entry)}
                              className="flex-1 text-xs h-7"
                            >
                              Swap
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeMeal(entry.id)}
                              className="h-7 w-7 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAddModal(date, mealType)}
                            className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-green-700 hover:bg-green-50"
                          >
                            <Plus className="w-5 h-5 text-slate-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Recipe Search/Swap Modal */}
        <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedEntry?.id ? "Swap Recipe" : "Add Recipe"} -{" "}
                {selectedEntry?.meal_type}
              </DialogTitle>
            </DialogHeader>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedEntry) {
                      searchRecipes(e.target.value);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No recipes found. Try a different search.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {searchResults.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => selectRecipe(recipe.id)}
                      className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      {recipe.image_url && (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-3">
                        <h4 className="font-medium text-sm text-slate-900">
                          {recipe.title}
                        </h4>
                        {recipe.ready_in_minutes && (
                          <p className="text-xs text-slate-500 mt-1">
                            {recipe.ready_in_minutes} mins
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
