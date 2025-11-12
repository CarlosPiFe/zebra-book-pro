import { Square, Circle, Armchair, Sofa, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DesignerSidebarProps {
  onAddElement: (elementType: string) => void;
}

const elements = [
  {
    type: "table-square",
    label: "Mesa cuadrada",
    icon: Square,
    color: "bg-blue-500",
  },
  {
    type: "table-round",
    label: "Mesa redonda",
    icon: Circle,
    color: "bg-blue-500",
  },
  {
    type: "chair",
    label: "Silla",
    icon: Armchair,
    color: "bg-green-500",
  },
  {
    type: "sofa",
    label: "Sofá",
    icon: Sofa,
    color: "bg-purple-500",
  },
  {
    type: "wall",
    label: "Pared/Barra",
    icon: Minus,
    color: "bg-gray-500",
  },
];

export function DesignerSidebar({ onAddElement }: DesignerSidebarProps) {
  return (
    <div className="w-64 border-l border-border p-4 bg-card overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Elementos</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Haz clic en un elemento para añadirlo al diseño
      </p>

      <div className="space-y-2">
        {elements.map((element) => {
          const Icon = element.icon;
          return (
            <Card
              key={element.type}
              className="p-4 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => onAddElement(element.type)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg ${element.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{element.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Clic para añadir
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Controles</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Arrastra para mover</li>
          <li>• Esquinas para redimensionar</li>
          <li>• Ctrl + rueda para rotar</li>
          <li>• Supr para eliminar</li>
        </ul>
      </div>
    </div>
  );
}