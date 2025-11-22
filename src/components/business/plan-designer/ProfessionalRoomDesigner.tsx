import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";
import { ElementPalette, ElementTemplate } from "./ElementPalette";
import { PlanCanvas } from "./PlanCanvas";
import { PropertiesPanel } from "./PropertiesPanel";

interface PlacedElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  tableId?: string;
  tableNumber?: number;
  capacity?: number;
  assignedWaiterId?: string;
}

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

interface ProfessionalRoomDesignerProps {
  businessId: string;
  rooms: Room[];
  selectedRoomId: string | null;
  onRoomChange: (roomId: string) => void;
}

export function ProfessionalRoomDesigner({ 
  businessId, 
  selectedRoomId,
  rooms,
  onRoomChange
}: ProfessionalRoomDesignerProps) {
  const [elements, setElements] = useState<PlacedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<PlacedElement | null>(null);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [draggedTemplate, setDraggedTemplate] = useState<ElementTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load data when room changes
  useEffect(() => {
    if (selectedRoomId) {
      loadElements();
      loadWaiters();
    }
  }, [selectedRoomId, businessId]);

  const loadElements = async () => {
    if (!selectedRoomId) return;
    
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .eq("room_id", selectedRoomId);

      if (error) throw error;

      const loadedElements: PlacedElement[] = (data || [])
        .filter(t => t.position_x !== null && t.position_y !== null)
        .map(table => ({
          id: table.id,
          type: table.element_type || 'table-square',
          x: table.position_x!,
          y: table.position_y!,
          width: table.width || 100,
          height: table.height || 100,
          rotation: table.rotation || 0,
          tableId: table.id,
          tableNumber: table.table_number,
          capacity: table.max_capacity,
          assignedWaiterId: table.assigned_waiter_id || undefined,
        }));

      setElements(loadedElements);
    } catch (error) {
      console.error("Error loading elements:", error);
      toast.error("Error al cargar los elementos");
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save or update all elements
      for (const element of elements) {
        const isTable = element.type.startsWith('table');

        if (element.tableId) {
          // Update existing
          await supabase
            .from("tables")
            .update({
              position_x: element.x,
              position_y: element.y,
              rotation: element.rotation,
              width: element.width,
              height: element.height,
              element_type: element.type,
              ...(isTable && {
                table_number: element.tableNumber || 1,
                max_capacity: element.capacity || 4,
                assigned_waiter_id: element.assignedWaiterId || null,
              }),
            })
            .eq("id", element.tableId);
        } else {
          // Create new
          const { data: existingTables } = await supabase
            .from("tables")
            .select("table_number")
            .eq("business_id", businessId)
            .order("table_number", { ascending: false })
            .limit(1);

          const nextTableNumber = existingTables?.[0]?.table_number 
            ? existingTables[0].table_number + 1 
            : 1;

          const { data, error } = await supabase
            .from("tables")
            .insert({
              business_id: businessId,
              room_id: selectedRoomId,
              table_number: element.tableNumber || nextTableNumber,
              max_capacity: element.capacity || 4,
              min_capacity: 1,
              position_x: element.x,
              position_y: element.y,
              rotation: element.rotation,
              width: element.width,
              height: element.height,
              element_type: element.type,
              assigned_waiter_id: element.assignedWaiterId || null,
            })
            .select()
            .single();

          if (error) throw error;

          // Update element with tableId
          element.tableId = data.id;
        }
      }

      toast.success("Diseño guardado correctamente");
      await loadElements();
    } catch (error) {
      console.error("Error saving layout:", error);
      toast.error("Error al guardar el diseño");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedElement) return;

    try {
      if (selectedElement.tableId) {
        await supabase
          .from("tables")
          .delete()
          .eq("id", selectedElement.tableId);
      }

      setElements(elements.filter(e => e.id !== selectedElement.id));
      setSelectedElement(null);
      toast.success("Elemento eliminado");
    } catch (error) {
      console.error("Error deleting element:", error);
      toast.error("Error al eliminar el elemento");
    }
  };

  const handleElementUpdate = (updatedElement: PlacedElement) => {
    setElements(elements.map(e => e.id === updatedElement.id ? updatedElement : e));
    setSelectedElement(updatedElement);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Element Palette */}
      <ElementPalette onDragStart={setDraggedTemplate} />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-2">
            {/* Room Selector */}
            <Select
              value={selectedRoomId || ""}
              onValueChange={onRoomChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar sala" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border" />

            <Button
              onClick={handleSave}
              disabled={isSaving || !selectedRoomId}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar Plano"}
            </Button>
            {selectedElement && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {elements.length} elemento{elements.length !== 1 ? 's' : ''} en el plano
          </div>
        </div>

        {/* Canvas */}
        <PlanCanvas
          elements={elements}
          onElementsChange={setElements}
          onElementSelect={setSelectedElement}
          draggedTemplate={draggedTemplate}
          waiters={waiters}
        />
      </div>

      {/* Right Sidebar - Properties Panel */}
      {selectedElement && (
        <PropertiesPanel
          element={selectedElement}
          waiters={waiters}
          onUpdate={handleElementUpdate}
          onClose={() => setSelectedElement(null)}
        />
      )}
    </div>
  );
}