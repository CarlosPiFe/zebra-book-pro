import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { List, PenTool } from "lucide-react";
import { TablesView } from "./TablesView";
import { RoomDesigner } from "./RoomDesigner";

interface Room {
  id: string;
  name: string;
  is_active: boolean;
}

interface TablesViewWrapperProps {
  businessId: string;
}

export function TablesViewWrapper({ businessId }: TablesViewWrapperProps) {
  const [viewMode, setViewMode] = useState<"list" | "design">("list");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, [businessId]);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("business_rooms")
        .select("id, name, is_active")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* View mode selector */}
      <div className="flex-shrink-0 bg-background border-b px-4 md:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Listado de mesas
          </Button>
          <Button
            variant={viewMode === "design" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("design")}
            className="gap-2"
          >
            <PenTool className="h-4 w-4" />
            Diseño de sala
          </Button>
        </div>
      </div>

      {/* Render view based on mode */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "design" ? (
          <RoomDesigner
            businessId={businessId}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onRoomChange={setSelectedRoomId}
          />
        ) : (
          <TablesView businessId={businessId} />
        )}
      </div>
    </div>
  );
}