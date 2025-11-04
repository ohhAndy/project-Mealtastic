"use client";

import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CUISINE_TYPES, DIET_TYPES, MAX_TIME_OPTIONS } from "@/lib/constants";

export default function RecipeSearchBar() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cuisine, setCuisine] = useState('all');
  const [diet, setDiet] = useState('all');
  const [maxReadyTime, setMaxReadyTime] = useState('all');

  const handleSearch = () => {
    //TODO: LINK BACKEND
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
        handleSearch()
    }
  };

  const handleClearFilters = () => {
    setQuery("");
    setCuisine("all");
    setDiet("all");
  }

  const hasActiveFilters = query || cuisine != "all" || diet != "all";

  return (
    <div className="p-6 rounded-lg shadow-md space-y-4 bg-slate-100">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2 h-5 w-4"></Search>
          <Input
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-green-700" : ""}
        >
          <SlidersHorizontal></SlidersHorizontal>
        </Button>
        <Button onClick={handleSearch} disabled={isLoading} className="hover:bg-green-700">
          {isLoading ? (
            <>
              <Loader2 className="animate-spin"></Loader2>
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label className="font-medium">Cuisine</Label>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger>
                <SelectValue placeholder="All cuisines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cuisines</SelectItem>
                {CUISINE_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toLocaleUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Diet</Label>
            <Select value={diet} onValueChange={setDiet}>
              <SelectTrigger>
                <SelectValue placeholder="All diets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diets</SelectItem>
                {DIET_TYPES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.split("-").map(word => word.charAt(0).toLocaleUpperCase() + word.slice(1)).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Prep Time</Label>
            <Select value={maxReadyTime} onValueChange={setMaxReadyTime}>
              <SelectTrigger>
                <SelectValue placeholder="All Times" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                {MAX_TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {`${t} minutes`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="col-span-2">
                <Button size="sm" onClick={handleClearFilters} className="hover:bg-green-700">
                    Clear all filters
                </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
