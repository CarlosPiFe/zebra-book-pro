import { useState } from "react";
import { Users, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Waiter {
  id: string;
  name: string;
  position: string | null;
}

interface Table {
  id: string;
  table_number: number;
  assigned_waiter_id?: string | null;
  element_type?: string | null;
}

interface Room {
  id: string;
  name: string;
  is_active: boolean;
}

interface EmployeesSidebarProps {
  waiters: Waiter[];
  tables: Table[];
  rooms: Room[];
  selectedRoomId: string | null;
  onRoomChange: (roomId: string) => void;
  onAssignWaiter: (tableId: string, waiterId: string | null) => void;
}

export function EmployeesSidebar({
  waiters,
  tables,
  rooms,
  selectedRoomId,
  onRoomChange,
  onAssignWaiter,
}: EmployeesSidebarProps) {
  const [expandedWaiterId, setExpandedWaiterId] = useState<string | null>(null);

  const getWaiterTables = (waiterId: string) => {
    return tables.filter((t) => t.assigned_waiter_id === waiterId);
  };

  const getUnassignedTables = () => {
    return tables.filter((t) => !t.assigned_waiter_id);
  };

  return (
    <div className="w-64 border-r border-border p-4 bg-card overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Gestión
      </h3>

      {/* Room selector */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Sala</label>
        <Select value={selectedRoomId || ""} onValueChange={onRoomChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una sala" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Waiters list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Camareros
        </h4>
        {waiters.map((waiter) => {
          const waiterTables = getWaiterTables(waiter.id);
          const isExpanded = expandedWaiterId === waiter.id;

          return (
            <Card key={waiter.id} className="p-3">
              <button
                onClick={() =>
                  setExpandedWaiterId(isExpanded ? null : waiter.id)
                }
                className="w-full text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{waiter.name}</span>
                  <Badge variant="secondary">{waiterTables.length}</Badge>
                </div>
                {waiter.position && (
                  <p className="text-xs text-muted-foreground">
                    {waiter.position}
                  </p>
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {waiterTables.length > 0 ? (
                    waiterTables.map((table) => (
                      <div
                        key={table.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-1">
                          <TableProperties className="w-3 h-3" />
                          Mesa {table.table_number}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAssignWaiter(table.id, null)}
                          className="h-6 text-xs"
                        >
                          Quitar
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sin mesas asignadas
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Unassigned tables */}
      {getUnassignedTables().length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Mesas sin asignar
          </h4>
          <div className="space-y-2">
            {getUnassignedTables().map((table) => (
              <Card key={table.id} className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <TableProperties className="w-3 h-3" />
                    Mesa {table.table_number}
                  </span>
                  <Select
                    value=""
                    onValueChange={(waiterId) =>
                      onAssignWaiter(table.id, waiterId)
                    }
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue placeholder="Asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      {waiters.map((waiter) => (
                        <SelectItem key={waiter.id} value={waiter.id}>
                          {waiter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}