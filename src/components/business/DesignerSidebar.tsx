import { Square, Circle, Armchair, Sofa, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesignerSidebarProps {
  onAddElement: (elementType: string) => void;
}

const elements = [
  {
    type: "table-square",
    label: "Mesa cuadrada",
    icon: Square,
  },
  {
    type: "table-round",
    label: "Mesa redonda",
    icon: Circle,
  },
  {
    type: "chair",
    label: "Silla",
    icon: Armchair,
  },
  {
    type: "sofa",
    label: "Sofá",
    icon: Sofa,
  },
  {
    type: "wall",
    label: "Pared/Barra",
    icon: Minus,
  },
];

export function DesignerSidebar({ onAddElement }: DesignerSidebarProps) {
  return (
    <div className="w-[280px] h-full bg-card border-l border-border flex flex-col py-6 overflow-y-auto">
      <div className="px-4 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Elementos
        </h3>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {elements.map((element) => {
          const Icon = element.icon;
          return (
            <button
              key={element.type}
              onClick={() => onAddElement(element.type)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                "hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{element.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 mx-2 p-3 bg-muted/50 rounded-lg">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Controles
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Arrastra para mover</li>
          <li>• Esquinas para redimensionar</li>
          <li>• Ctrl + rueda para rotar</li>
          <li>• Supr para eliminar</li>
        </ul>
      </div>
    </div>
  );
}