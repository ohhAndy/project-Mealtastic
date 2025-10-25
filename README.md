# Mealtastic
## Main Features
Mealtastic is a personal web application that allows users to search for and save their favourite recipes. Users can also generate weekly meal plans based on their saved recipes and preferences, and dynamically create shopping lists to make meal preparation easier and more organized.

## Beta Version Features
### Login and Authentication 
Local

OAuth (Google)
### Search Recipes
Grab recipes from external API or dataset ( RecipeNLG, Spoonacular)

Use filters: type (breakfast, lunch, dinner), ingredients, dietary restrictions (ie min/max calories, no dairy, vegan/vegetarian), prep time range

Sorting by rating, prep time
### Display Recipes 
Display recipe details (Ingredients, instructions, images, rating, reviews)

Option to review the recipe (5-star system)
### Save Recipes 
Users can view their saved recipes
### Weekly Meal Planner 
Calendar style grid UI

Users will manually assign recipes to meals of the week
## Final Version Features
### Generate Weekly Meal Plan 
Algorithm will generate a weekly meal plan based on preferences and saved recipes
### Weekly Shopping List Generator
Generates a shopping list of ingredients based off of the planned weekly meals/recipes.

Time Permitting: Make the shopping list dynamic (update it when plan changes) 
Own domain name

## Tech Stack
Frontend: Next.js

Backend: Express.js

Database: Postgresql

Deploying: Docker
## Work Division
Andy Hu (1010961791): Frontend 

Jean Luc Imanishimwe (1009523838): Backend + Deploying

Ramim Raiyan(1008038455): Database + Deploying 
## Top 5 Technical Challenges
### Integrating the external API or dataset (RecipeNLG, Spoonacular) into our application 
Since the API is external and we cannot control it, we may get incomplete recipe data, rate limited, or the API endpoint may break. 
### Deploying on our own domain name
Using namecheap for education to get a free domain name, secure an SSL certificate for our domain and deploy on domain.
### Weekly meal plan generation
Generating a weekly plan based on user preferences and saved recipes, will require an algorithmic generation system. 
### Shopping list generation
Consolidating all the ingredients and normalizing the units (tbsp, tsp, cup, etc) will be a challenge.

Grouping ingredients into categories to make the shopping list more easily readable for the users may also be challenging
### Calendar UI
Designing a responsive weekly meal planner calendar that clearly displays meals for each day and integrates seamlessly with the AI-generated plan will be challenging. 

