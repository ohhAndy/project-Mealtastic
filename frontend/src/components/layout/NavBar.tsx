"use client";

import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Calendar, ChefHat, LogOut, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: logoutUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      logoutUser();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Logout anyway on frontend
      logoutUser();
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/recipes", label: "Recipes", icon: Search },
    { href: "/meal-plans", label: "Meal Plans", icon: Calendar },
    { href: "/saved", label: "Saved", icon: ChefHat },
    { href: "/room", label: "Cook Rooms", icon: ChefHat},
  ];

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <nav className="border-b bg-green-700 sticky top-0 z-50 hidden md:block">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">MealPlanner</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Nav Links */}
            {user && (
              <div className="hidden md:flex space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href}>
                      <Button
                        variant={isActive(link.href) ? "default" : "ghost"}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Profile */}
            <div className="flex items-center space-x-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login">
                    <Button variant="ghost">Log in</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Sign up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
