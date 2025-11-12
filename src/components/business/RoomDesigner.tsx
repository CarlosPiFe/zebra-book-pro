import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect, Circle, FabricObject } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Save } from "lucide-react";
import { DesignerSidebar } from "./DesignerSidebar";
import { EmployeesSidebar } from "./EmployeesSidebar";

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
  min_capacity: number;
  room_id?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  rotation?: number | null;
  width?: number | null;
  height?: number | null;
  element_type?: string | null;
  assigned_waiter_id?: string | null;
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

interface RoomDesignerProps {
  businessId: string;
  rooms: Room[];
  selectedRoomId: string | null;
  onRoomChange: (roomId: string) => void;
}

export function RoomDesigner({ 
  businessId, 
  rooms, 
  selectedRoomId,
  onRoomChange 
}: RoomDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [selectedElement, setSelectedElement] = useState<FabricObject | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#f8f9fa",
    });

    setFabricCanvas(canvas);

    // Handle selection
    canvas.on("selection:created", (e) => {
      setSelectedElement(e.selected?.[0] || null);
    });

    canvas.on("selection:updated", (e) => {
      setSelectedElement(e.selected?.[0] || null);
    });

    canvas.on("selection:cleared", () => {
      setSelectedElement(null);
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      loadTables();
      loadWaiters();
    }
  }, [selectedRoomId, businessId]);

  useEffect(() => {
    if (fabricCanvas && tables.length > 0) {
      renderTablesOnCanvas();
    }
  }, [tables, fabricCanvas]);

  const loadTables = async () => {
    if (!selectedRoomId) return;
    
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .eq("room_id", selectedRoomId);

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Error al cargar las mesas");
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

  const renderTablesOnCanvas = () => {
    if (!fabricCanvas) return;

    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#f8f9fa";

    tables.forEach((table) => {
      if (table.position_x !== null && table.position_y !== null) {
        const elementType = table.element_type || "table-square";
        
        // Get waiter color if table is assigned
        const assignedWaiter = waiters.find(w => w.id === table.assigned_waiter_id);
        const waiterColor = assignedWaiter?.color || null;
        
        let element: FabricObject;
        let fillColor: string;
        let strokeColor: string;

        // Use waiter color if assigned, otherwise use default colors
        if (waiterColor && (elementType === "table-round" || elementType === "table-square")) {
          fillColor = waiterColor;
          strokeColor = waiterColor;
        } else {
          // Default colors for unassigned tables and other elements
          fillColor = elementType === "chair" ? "#10b981" : 
                     elementType === "sofa" ? "#8b5cf6" : 
                     elementType === "wall" ? "#6b7280" : "#3b82f6";
          strokeColor = elementType === "chair" ? "#059669" : 
                       elementType === "sofa" ? "#7c3aed" : 
                       elementType === "wall" ? "#374151" : "#1e40af";
        }

        if (elementType === "table-round") {
          element = new Circle({
            left: table.position_x,
            top: table.position_y,
            radius: (table.width || 100) / 2,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 2,
          });
        } else {
          element = new Rect({
            left: table.position_x,
            top: table.position_y,
            width: table.width || 100,
            height: table.height || 100,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 2,
            angle: table.rotation || 0,
          });
        }

        // Store table ID in the element
        element.set("data", { tableId: table.id });
        fabricCanvas.add(element);
      }
    });

    fabricCanvas.renderAll();
  };

  const addElementToCanvas = (elementType: string) => {
    if (!fabricCanvas) return;

    let element: FabricObject;
    const left = 100;
    const top = 100;

    if (elementType === "table-round") {
      element = new Circle({
        left,
        top,
        radius: 50,
        fill: "#3b82f6",
        stroke: "#1e40af",
        strokeWidth: 2,
      });
    } else {
      const width = elementType === "wall" ? 200 : 100;
      const height = elementType === "wall" ? 20 : 100;
      
      element = new Rect({
        left,
        top,
        width,
        height,
        fill: elementType === "chair" ? "#10b981" : 
              elementType === "sofa" ? "#8b5cf6" : 
              elementType === "wall" ? "#6b7280" : "#3b82f6",
        stroke: elementType === "chair" ? "#059669" : 
                elementType === "sofa" ? "#7c3aed" : 
                elementType === "wall" ? "#374151" : "#1e40af",
        strokeWidth: 2,
      });
    }

    // Store element type
    element.set("data", { elementType, isNew: true });
    fabricCanvas.add(element);
    fabricCanvas.setActiveObject(element);
    fabricCanvas.renderAll();

    // Save to database immediately
    saveNewElement(element, elementType);
  };

  const saveNewElement = async (element: FabricObject, elementType: string) => {
    try {
      // Find highest table number
      const { data: existingTables } = await supabase
        .from("tables")
        .select("table_number")
        .eq("business_id", businessId)
        .order("table_number", { ascending: false })
        .limit(1);

      const nextTableNumber = existingTables && existingTables.length > 0 && existingTables[0]
        ? existingTables[0].table_number + 1 
        : 1;

      const { data, error } = await supabase
        .from("tables")
        .insert({
          business_id: businessId,
          room_id: selectedRoomId,
          table_number: nextTableNumber,
          max_capacity: 4,
          min_capacity: 1,
          position_x: element.left,
          position_y: element.top,
          rotation: element.angle || 0,
          width: element.width,
          height: element.height,
          element_type: elementType,
        })
        .select()
        .single();

      if (error) throw error;

      // Update element with the new table ID
      element.set("data", { tableId: data.id, elementType });
      toast.success("Elemento añadido correctamente");
      loadTables();
    } catch (error) {
      console.error("Error saving element:", error);
      toast.error("Error al guardar el elemento");
    }
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    setIsSaving(true);
    try {
      const objects = fabricCanvas.getObjects();
      
      for (const obj of objects) {
        const data = obj.get("data") as any;
        if (data?.tableId) {
          await supabase
            .from("tables")
            .update({
              position_x: obj.left,
              position_y: obj.top,
              rotation: obj.angle || 0,
              width: obj.width || 100,
              height: obj.height || 100,
            })
            .eq("id", data.tableId);
        }
      }

      toast.success("Diseño guardado correctamente");
      loadTables();
    } catch (error) {
      console.error("Error saving layout:", error);
      toast.error("Error al guardar el diseño");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedElement || !fabricCanvas) return;

    const data = selectedElement.get("data") as any;
    if (data?.tableId) {
      try {
        await supabase
          .from("tables")
          .delete()
          .eq("id", data.tableId);

        fabricCanvas.remove(selectedElement);
        fabricCanvas.renderAll();
        toast.success("Elemento eliminado");
        loadTables();
      } catch (error) {
        console.error("Error deleting element:", error);
        toast.error("Error al eliminar el elemento");
      }
    }
  };

  const handleAssignWaiter = async (tableId: string, waiterId: string | null) => {
    try {
      await supabase
        .from("tables")
        .update({ assigned_waiter_id: waiterId })
        .eq("id", tableId);

      toast.success("Camarero asignado correctamente");
      loadTables();
    } catch (error) {
      console.error("Error assigning waiter:", error);
      toast.error("Error al asignar camarero");
    }
  };

  const handleWaiterColorChange = async (waiterId: string, color: string) => {
    try {
      await supabase
        .from("waiters")
        .update({ color })
        .eq("id", waiterId);

      toast.success("Color actualizado");
      loadWaiters();
      // Refresh canvas to show new colors
      setTimeout(() => loadTables(), 100);
    } catch (error) {
      console.error("Error updating waiter color:", error);
      toast.error("Error al actualizar el color");
    }
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar - Employees */}
      <EmployeesSidebar
        waiters={waiters}
        tables={tables}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onRoomChange={onRoomChange}
        onAssignWaiter={handleAssignWaiter}
        onWaiterColorChange={handleWaiterColorChange}
      />

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar diseño"}
            </Button>
            {selectedElement && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar elemento
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 border border-border rounded-lg overflow-hidden bg-background shadow-lg">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Right sidebar - Elements */}
      <DesignerSidebar onAddElement={addElementToCanvas} />
    </div>
  );
}