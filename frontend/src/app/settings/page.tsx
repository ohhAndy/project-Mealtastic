'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PreferencesForm from "@/components/settings/PreferencesForm";
import { useRequireAuth } from "@/lib/hooks/useAuth";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();

  if (authLoading || !user) return null;
  
  return (
    <div className="max-w-xl mx-auto p-6">
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">User Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesForm />
        </CardContent>
      </Card>
    </div>
  );
}
