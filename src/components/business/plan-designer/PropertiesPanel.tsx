import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

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

interface Waiter {
  id: string;
  name: string;
  position: string | null;
  color: string | null;
}

interface PropertiesPanelProps {
  element: PlacedElement | null;
  waiters: Waiter[];
  onUpdate: (element: PlacedElement) => void;
  onClose: () => void;
}

export function PropertiesPanel({ element, waiters, onUpdate, onClose }: PropertiesPanelProps) {
  const [localElement, setLocalElement] = useState<PlacedElement | null>(element);

  useEffect(() => {
    setLocalElement(element);
  }, [element]);

  if (!localElement) return null;

  const isTable = localElement.type.startsWith('table');

  const handleUpdate = (field: keyof PlacedElement, value: any) => {
    const updated = { ...localElement, [field]: value };
    setLocalElement(updated);
    onUpdate(updated);
  };

  return (
    <div className="w-[320px] h-full bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Propiedades</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Position */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">POSICIÓN</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="x" className="text-xs">X</Label>
              <Input
                id="x"
                type="number"
                value={Math.round(localElement.x)}
                onChange={(e) => handleUpdate('x', parseFloat(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="y" className="text-xs">Y</Label>
              <Input
                id="y"
                type="number"
                value={Math.round(localElement.y)}
                onChange={(e) => handleUpdate('y', parseFloat(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">TAMAÑO</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width" className="text-xs">Ancho</Label>
              <Input
                id="width"
                type="number"
                value={Math.round(localElement.width)}
                onChange={(e) => handleUpdate('width', parseFloat(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-xs">Alto</Label>
              <Input
                id="height"
                type="number"
                value={Math.round(localElement.height)}
                onChange={(e) => handleUpdate('height', parseFloat(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <Label htmlFor="rotation" className="text-xs font-semibold text-muted-foreground">ROTACIÓN</Label>
          <Input
            id="rotation"
            type="number"
            value={Math.round(localElement.rotation)}
            onChange={(e) => handleUpdate('rotation', parseFloat(e.target.value))}
            className="h-8 text-xs"
            min="0"
            max="360"
          />
        </div>

        {/* Table-specific properties */}
        {isTable && (
          <>
            <div className="space-y-2">
              <Label htmlFor="tableNumber" className="text-xs font-semibold text-muted-foreground">NÚMERO DE MESA</Label>
              <Input
                id="tableNumber"
                type="number"
                value={localElement.tableNumber || ''}
                onChange={(e) => handleUpdate('tableNumber', parseInt(e.target.value))}
                className="h-8 text-xs"
                placeholder="Número de mesa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-xs font-semibold text-muted-foreground">CAPACIDAD</Label>
              <Input
                id="capacity"
                type="number"
                value={localElement.capacity || 4}
                onChange={(e) => handleUpdate('capacity', parseInt(e.target.value))}
                className="h-8 text-xs"
                min="1"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waiter" className="text-xs font-semibold text-muted-foreground">CAMARERO ASIGNADO</Label>
              <Select
                value={localElement.assignedWaiterId || "none"}
                onValueChange={(value) => handleUpdate('assignedWaiterId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: waiter.color || '#3b82f6' }}
                        />
                        {waiter.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Element type info */}
        <div className="pt-4 border-t border-border">
          <Label className="text-xs font-semibold text-muted-foreground">TIPO</Label>
          <p className="text-xs text-foreground mt-1">{localElement.type}</p>
        </div>
      </div>
    </div>
  );
}