'use client'

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/recipes'); // logged-in users go here
      } else {
        router.push('/login'); // logged-out users go here
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;

  return null; 
}
