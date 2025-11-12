import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  onWaiterColorChange: (waiterId: string, color: string) => void;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e",
];

export function EmployeesSidebar({
  waiters,
  tables,
  rooms,
  selectedRoomId,
  onRoomChange,
  onWaiterColorChange,
}: EmployeesSidebarProps) {
  const getWaiterTables = (waiterId: string) => {
    return tables.filter((t) => t.assigned_waiter_id === waiterId);
  };

  return (
    <div className="w-[280px] h-full bg-card border-r border-border flex flex-col py-6 overflow-y-auto">
      {/* Room selector */}
      <div className="px-4 mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Sala
        </label>
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
      <div className="px-4 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Camareros
        </h3>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {waiters.map((waiter) => {
          const waiterTables = getWaiterTables(waiter.id);
          const waiterColor = waiter.color || "#3b82f6";

          return (
            <div
              key={waiter.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                "hover:bg-accent"
              )}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: waiterColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="right">
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border-2 border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => onWaiterColorChange(waiter.id, color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{waiter.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {waiterTables.length} {waiterTables.length === 1 ? "mesa" : "mesas"}
                  </span>
                </div>
                {waiter.position && (
                  <p className="text-xs text-muted-foreground truncate">
                    {waiter.position}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}