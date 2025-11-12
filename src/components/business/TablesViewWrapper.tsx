import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { List, PenTool } from "lucide-react";
import { TablesView } from "./TablesView";
import { RoomDesigner } from "./RoomDesigner";
import { EmployeesSidebar } from "./EmployeesSidebar";

interface Room {
  id: string;
  name: string;
  is_active: boolean;
}

interface Waiter {
  id: string;
  name: string;
  position: string | null;
  color: string | null;
}

interface Table {
  id: string;
  table_number: number;
  assigned_waiter_id?: string | null;
  element_type?: string | null;
}

interface TablesViewWrapperProps {
  businessId: string;
}

export function TablesViewWrapper({ businessId }: TablesViewWrapperProps) {
  const [viewMode, setViewMode] = useState<"list" | "design">("list");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    loadRooms();
    loadWaiters();
    loadTables();
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

  const loadWaiters = async () => {
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select("id, name, position, color")
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (error) throw error;
      setWaiters(data || []);
    } catch (error) {
      console.error("Error loading waiters:", error);
    }
  };

  const loadTables = async () => {
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("id, table_number, assigned_waiter_id, element_type")
        .eq("business_id", businessId);

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  };

  const handleWaiterColorChange = async (waiterId: string, color: string) => {
    try {
      const { error } = await supabase
        .from("waiters")
        .update({ color })
        .eq("id", waiterId);

      if (error) throw error;
      
      await loadWaiters();
    } catch (error) {
      console.error("Error updating waiter color:", error);
    }
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Employees Sidebar - shown in both views */}
      <EmployeesSidebar
        waiters={waiters}
        tables={tables}
        onWaiterColorChange={handleWaiterColorChange}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
    </div>
  );
}