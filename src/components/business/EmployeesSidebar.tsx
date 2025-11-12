import { cn } from "@/lib/utils";
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

interface EmployeesSidebarProps {
  waiters: Waiter[];
  tables: Table[];
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
  onWaiterColorChange,
}: EmployeesSidebarProps) {
  const getWaiterTables = (waiterId: string) => {
    return tables.filter((t) => t.assigned_waiter_id === waiterId);
  };

  return (
    <div className="w-[280px] h-full bg-sidebar border-r border-border flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-6">
        <h2 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
          GESTIÓN DE MESAS
        </h2>
      </div>
      
      {/* Waiters list */}
      <nav className="flex-1 px-4 space-y-1">
        {waiters.map((waiter) => {
          const waiterTables = getWaiterTables(waiter.id);
          const waiterColor = waiter.color || "#3b82f6";

          return (
            <div
              key={waiter.id}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors",
                "hover:bg-sidebar-accent cursor-pointer"
              )}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-sidebar-border hover:scale-110 transition-transform"
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
                <div className="flex items-center gap-2">
                  <span className="truncate font-normal text-sidebar-foreground">{waiter.name}</span>
                  <span className="text-xs text-sidebar-foreground/50 flex-shrink-0">
                    ({waiterTables.length})
                  </span>
                </div>
                {waiter.position && (
                  <p className="text-xs text-sidebar-foreground/50 truncate mt-0.5">
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