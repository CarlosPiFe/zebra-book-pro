import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { MyBookings } from "@/components/profile/MyBookings";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { AccountSecurity } from "@/components/profile/AccountSecurity";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleProfileUpdate = () => {
    if (user) {
      loadProfile(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header with avatar and basic info */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{profile?.full_name || "Usuario"}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </Card>

          {/* Tabs for different sections */}
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bookings">Mis reservas</TabsTrigger>
              <TabsTrigger value="settings">Configuración</TabsTrigger>
              <TabsTrigger value="security">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-6">
              <MyBookings userId={user?.id || ""} />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <ProfileSettings 
                userId={user?.id || ""} 
                profile={profile}
                onUpdate={handleProfileUpdate}
              />
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <AccountSecurity userEmail={user?.email || ""} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
