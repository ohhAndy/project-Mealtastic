import { ChefHat } from "lucide-react";
import Link from "next/link";

export default async function NavBar() {
    return(
        <header className="sticky top-0 backdrop-blur bg-green-700">
            <div className="flex gap-3 items-center px-6 py-2 mx-auto">
                <ChefHat width={48} height={48}></ChefHat>
                <span className="font-bold text-2xl">Mealtastic</span>
                
                <nav className="flex items-center gap-4 ml-auto">
                    <Link href="/recipes" className="text-md font-medium hover:text-blue-600">Recipes</Link>
                    <Link href="/meal-plans" className="text-md font-medium hover:text-blue-600">Meal Plans</Link>
                    <Link href="/shopping-lists" className="text-md font-medium hover:text-blue-600">Shopping Lists</Link>
                </nav>
            </div>
        </header>
    );
}