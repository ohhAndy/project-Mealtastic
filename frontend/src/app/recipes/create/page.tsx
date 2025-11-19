"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X, Clock, Users, ChefHat, Package, Utensils } from "lucide-react";

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface InstructionStep {
  number: number;
  step: string;
  ingredients: string[];
  equipment: string[];
}

interface InstructionBlock {
  name: string;
  steps: InstructionStep[];
}

interface RecipeForm {
  title: string;
  image: string;
  readyInMinutes: string;
  servings: string;
  cuisines: string[];
  diets: string[];
  extendedIngredients: Ingredient[];
  analyzedInstructions: InstructionBlock[];
}

interface StepInputs {
  [key: string]: string;
}

export default function CreateRecipePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RecipeForm>({
    title: "",
    image: "",
    readyInMinutes: "",
    servings: "",
    cuisines: [],
    diets: [],
    extendedIngredients: [{ name: "", amount: "", unit: "" }],
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "",
            ingredients: [],
            equipment: [],
          },
        ],
      },
    ],
  });
  const [cuisineInput, setCuisineInput] = useState("");
  const [dietInput, setDietInput] = useState("");
  const [stepInputs, setStepInputs] = useState<StepInputs>({});

  const updateField = (field: keyof RecipeForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Ingredient handlers
  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      extendedIngredients: [
        ...prev.extendedIngredients,
        { name: "", amount: "", unit: "" },
      ],
    }));
  };

  const removeIngredient = (index: number) => {
    if (formData.extendedIngredients.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      extendedIngredients: prev.extendedIngredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setFormData((prev) => ({
      ...prev,
      extendedIngredients: prev.extendedIngredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  // Instruction handlers
  const addInstruction = () => {
    const currentSteps = formData.analyzedInstructions[0].steps;
    const newStepNumber = currentSteps.length + 1;
    
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: [
            ...currentSteps,
            {
              number: newStepNumber,
              step: "",
              ingredients: [],
              equipment: [],
            },
          ],
        },
      ],
    }));
  };

  const removeInstruction = (index: number) => {
    if (formData.analyzedInstructions[0].steps.length === 1) return;
    
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: prev.analyzedInstructions[0].steps
            .filter((_, i) => i !== index)
            .map((step, i) => ({ ...step, number: i + 1 })),
        },
      ],
    }));

    // Clean up step inputs
    const newStepInputs = { ...stepInputs };
    delete newStepInputs[`${index}-ingredient`];
    delete newStepInputs[`${index}-equipment`];
    setStepInputs(newStepInputs);
  };

  const updateInstruction = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: prev.analyzedInstructions[0].steps.map((step, i) =>
            i === index ? { ...step, step: value } : step
          ),
        },
      ],
    }));
  };

  // Step ingredient handlers
  const addStepIngredient = (stepIndex: number) => {
    const inputKey = `${stepIndex}-ingredient`;
    const ingredientName = stepInputs[inputKey]?.trim();
    
    if (!ingredientName) return;
    
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: prev.analyzedInstructions[0].steps.map((step, i) =>
            i === stepIndex
              ? { ...step, ingredients: [...step.ingredients, ingredientName] }
              : step
          ),
        },
      ],
    }));

    setStepInputs((prev) => ({ ...prev, [inputKey]: "" }));
  };

  const removeStepIngredient = (stepIndex: number, ingredientIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: prev.analyzedInstructions[0].steps.map((step, i) =>
            i === stepIndex
              ? {
                  ...step,
                  ingredients: step.ingredients.filter((_, j) => j !== ingredientIndex),
                }
              : step
          ),
        },
      ],
    }));
  };

  // Step equipment handlers
  const addStepEquipment = (stepIndex: number) => {
    const inputKey = `${stepIndex}-equipment`;
    const equipmentName = stepInputs[inputKey]?.trim();
    
    if (!equipmentName) return;
    
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: prev.analyzedInstructions[0].steps.map((step, i) =>
            i === stepIndex
              ? { ...step, equipment: [...step.equipment, equipmentName] }
              : step
          ),
        },
      ],
    }));

    setStepInputs((prev) => ({ ...prev, [inputKey]: "" }));
  };

  const removeStepEquipment = (stepIndex: number, equipmentIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      analyzedInstructions: [
        {
          ...prev.analyzedInstructions[0],
          steps: prev.analyzedInstructions[0].steps.map((step, i) =>
            i === stepIndex
              ? {
                  ...step,
                  equipment: step.equipment.filter((_, j) => j !== equipmentIndex),
                }
              : step
          ),
        },
      ],
    }));
  };

  const updateStepInput = (key: string, value: string) => {
    setStepInputs((prev) => ({ ...prev, [key]: value }));
  };

  // Cuisine handlers
  const addCuisine = () => {
    if (!cuisineInput.trim() || formData.cuisines.includes(cuisineInput.trim())) return;
    setFormData((prev) => ({
      ...prev,
      cuisines: [...prev.cuisines, cuisineInput.trim()],
    }));
    setCuisineInput("");
  };

  const removeCuisine = (cuisine: string) => {
    setFormData((prev) => ({
      ...prev,
      cuisines: prev.cuisines.filter((c) => c !== cuisine),
    }));
  };

  // Diet handlers
  const addDiet = () => {
    if (!dietInput.trim() || formData.diets.includes(dietInput.trim())) return;
    setFormData((prev) => ({
      ...prev,
      diets: [...prev.diets, dietInput.trim()],
    }));
    setDietInput("");
  };

  const removeDiet = (diet: string) => {
    setFormData((prev) => ({
      ...prev,
      diets: prev.diets.filter((d) => d !== diet),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      alert("Please enter a recipe title");
      return;
    }
    
    if (formData.extendedIngredients.some(ing => !ing.name.trim())) {
      alert("Please fill in all ingredient names");
      return;
    }
    
    if (formData.analyzedInstructions[0].steps.some(step => !step.step.trim())) {
      alert("Please fill in all instruction steps");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          image: formData.image || "",
          readyInMinutes: parseInt(formData.readyInMinutes) || undefined,
          servings: parseInt(formData.servings) || undefined,
          cuisines: formData.cuisines.length > 0 ? formData.cuisines : undefined,
          diets: formData.diets.length > 0 ? formData.diets : undefined,
          extendedIngredients: formData.extendedIngredients.map(ing => ({
            name: ing.name,
            amount: parseFloat(ing.amount) || 0,
            unit: ing.unit,
          })),
          analyzedInstructions: formData.analyzedInstructions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/recipes/${data.id}`);
      } else {
        const error = await response.text();
        alert(`Error creating recipe: ${error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create recipe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-green-800" />
              <CardTitle className="text-2xl">Create New Recipe</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Recipe Title <span className="text-red-800">*</span></Label>
                  <Input
                    id="title"
                    placeholder="e.g., Grandma's Chocolate Chip Cookies"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input
                    id="image"
                    type="url"
                    placeholder="https://example.com/recipe-image.jpg"
                    value={formData.image}
                    onChange={(e) => updateField("image", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="readyInMinutes" className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Ready in (minutes)
                    </Label>
                    <Input
                      id="readyInMinutes"
                      type="number"
                      min="0"
                      placeholder="45"
                      value={formData.readyInMinutes}
                      onChange={(e) => updateField("readyInMinutes", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="servings" className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Servings
                    </Label>
                    <Input
                      id="servings"
                      type="number"
                      min="1"
                      placeholder="4"
                      value={formData.servings}
                      onChange={(e) => updateField("servings", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Cuisines */}
              <div className="space-y-3">
                <Label>Cuisines</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Italian, Mexican, Asian"
                    value={cuisineInput}
                    onChange={(e) => setCuisineInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCuisine();
                      }
                    }}
                  />
                  <Button type="button" onClick={addCuisine} variant="secondary">
                    Add
                  </Button>
                </div>
                {formData.cuisines.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.cuisines.map((cuisine) => (
                      <span
                        key={cuisine}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {cuisine}
                        <button
                          type="button"
                          onClick={() => removeCuisine(cuisine)}
                          className="hover:text-purple-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Diets */}
              <div className="space-y-3">
                <Label>Diets</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Vegetarian, Vegan, Gluten Free"
                    value={dietInput}
                    onChange={(e) => setDietInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDiet();
                      }
                    }}
                  />
                  <Button type="button" onClick={addDiet} variant="secondary">
                    Add
                  </Button>
                </div>
                {formData.diets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.diets.map((diet) => (
                      <span
                        key={diet}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {diet}
                        <button
                          type="button"
                          onClick={() => removeDiet(diet)}
                          className="hover:text-green-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingredients */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Ingredients <span className="text-red-800">*</span></Label>
                {formData.extendedIngredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <Input
                        placeholder="1"
                        type="number"
                        step="0.01"
                        value={ingredient.amount}
                        onChange={(e) =>
                          updateIngredient(index, "amount", e.target.value)
                        }
                        className="col-span-2"
                      />
                      <Input
                        placeholder="cup"
                        value={ingredient.unit}
                        onChange={(e) =>
                          updateIngredient(index, "unit", e.target.value)
                        }
                        className="col-span-3"
                      />
                      <Input
                        placeholder="flour"
                        value={ingredient.name}
                        onChange={(e) =>
                          updateIngredient(index, "name", e.target.value)
                        }
                        className="col-span-7"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      disabled={formData.extendedIngredients.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addIngredient}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Instructions <span className="text-red-800">*</span></Label>
                {formData.analyzedInstructions[0].steps.map((stepObj, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      {/* Step number and description */}
                      <div className="flex gap-2 items-start">
                        <div className="shrink-0 w-8 h-10 flex items-center justify-center bg-green-100 text-green-700 rounded-md font-semibold">
                          {stepObj.number}
                        </div>
                        <Textarea
                          placeholder="Describe this step..."
                          value={stepObj.step}
                          onChange={(e) => updateInstruction(index, e.target.value)}
                          rows={2}
                          className="flex-1"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInstruction(index)}
                          disabled={formData.analyzedInstructions[0].steps.length === 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Step Ingredients */}
                      <div className="pl-10 space-y-2">
                        <Label className="text-sm flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Ingredients for this step
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., flour, eggs"
                            value={stepInputs[`${index}-ingredient`] || ""}
                            onChange={(e) =>
                              updateStepInput(`${index}-ingredient`, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addStepIngredient(index);
                              }
                            }}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addStepIngredient(index)}
                            variant="secondary"
                          >
                            Add
                          </Button>
                        </div>
                        {stepObj.ingredients.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {stepObj.ingredients.map((ing, ingIndex) => (
                              <span
                                key={ingIndex}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                              >
                                {ing}
                                <button
                                  type="button"
                                  onClick={() => removeStepIngredient(index, ingIndex)}
                                  className="hover:text-blue-900"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Step Equipment */}
                      <div className="pl-10 space-y-2">
                        <Label className="text-sm flex items-center gap-1">
                          <Utensils className="w-3 h-3" />
                          Equipment for this step
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., mixing bowl, whisk"
                            value={stepInputs[`${index}-equipment`] || ""}
                            onChange={(e) =>
                              updateStepInput(`${index}-equipment`, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addStepEquipment(index);
                              }
                            }}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addStepEquipment(index)}
                            variant="secondary"
                          >
                            Add
                          </Button>
                        </div>
                        {stepObj.equipment.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {stepObj.equipment.map((equip, equipIndex) => (
                              <span
                                key={equipIndex}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs"
                              >
                                {equip}
                                <button
                                  type="button"
                                  onClick={() => removeStepEquipment(index, equipIndex)}
                                  className="hover:text-orange-900"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInstruction}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/recipes")}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Recipe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}