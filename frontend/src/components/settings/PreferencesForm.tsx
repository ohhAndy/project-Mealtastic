"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getUserPreferences, updateUserPreferences } from "@/lib/api/settings";

export default function PreferencesForm() {
  const router = useRouter();
  const [prefs, setPrefs] = useState({
    minCalories: "",
    maxCalories: "",
    excludeIngredients: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const preferences = await getUserPreferences();
        // ensure it's always an object, even if undefined
        const safePrefs = preferences || {};

        setPrefs({
            minCalories: safePrefs.calorie_min,
            maxCalories: safePrefs.calorie_max,
            excludeIngredients: safePrefs.exclude_ingredients.join(", "),
        });
      } catch (err) {
        console.error(err);
      }
    }

    loadPrefs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        minCalories: prefs.minCalories,
        maxCalories: prefs.maxCalories,
        excludeIngredients: prefs.excludeIngredients
          .split(",")
          .map((i) => i.trim()),
      };

      await updateUserPreferences(body);
      toast.success("Preferences saved!");
      router.push("/recipes");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
      <div className="space-y-2">
        <Label htmlFor="calorie_min">Min Calories</Label>
        <Input
          id="calorie_min"
          type="number"
          value={prefs.minCalories ?? ""}
          onChange={(e) => setPrefs({ ...prefs, minCalories: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="calorie_max">Max Calories</Label>
        <Input
          id="calorie_max"
          type="number"
          value={prefs.maxCalories ?? ""}
          onChange={(e) => setPrefs({ ...prefs, maxCalories: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exclude_ingredients">
          Exclude Ingredients (comma-separated)
        </Label>
        <Input
          id="exclude_ingredients"
          value={prefs.excludeIngredients ?? ""}
          onChange={(e) =>
            setPrefs({ ...prefs, excludeIngredients: e.target.value })
          }
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  );
}
