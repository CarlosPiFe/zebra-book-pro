import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Square, Circle, Minus } from "lucide-react";

export interface ElementTemplate {
  id: string;
  type: string;
  category: 'tables' | 'structure' | 'decoration';
  label: string;
  icon: any;
  defaultWidth: number;
  defaultHeight: number;
  isCircular?: boolean;
}

const elementTemplates: ElementTemplate[] = [
  // Mesas
  { id: 'table-square', type: 'table-square', category: 'tables', label: 'Mesa Cuadrada', icon: Square, defaultWidth: 60, defaultHeight: 60 },
  { id: 'table-round', type: 'table-round', category: 'tables', label: 'Mesa Redonda', icon: Circle, defaultWidth: 60, defaultHeight: 60, isCircular: true },
  
  // Estructura
  { id: 'wall', type: 'wall', category: 'structure', label: 'Pared', icon: Minus, defaultWidth: 200, defaultHeight: 15 },
];

interface ElementPaletteProps {
  onDragStart: (template: ElementTemplate) => void;
}

export function ElementPalette({ onDragStart }: ElementPaletteProps) {
  const tables = elementTemplates.filter(t => t.category === 'tables');
  const structure = elementTemplates.filter(t => t.category === 'structure');

  const renderElement = (template: ElementTemplate) => {
    const Icon = template.icon;
    return (
      <div
        key={template.id}
        draggable
        onDragStart={() => onDragStart(template)}
        className="flex flex-col items-center justify-center p-4 border border-border rounded-lg cursor-move hover:bg-accent hover:border-primary transition-all bg-card"
      >
        <Icon className="w-8 h-8 mb-2 text-foreground" />
        <span className="text-xs text-center text-muted-foreground">{template.label}</span>
      </div>
    );
  };

  return (
    <div className="w-[280px] h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Elementos del Plano</h2>
        <p className="text-xs text-muted-foreground mt-1">Arrastra para añadir</p>
      </div>

      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={["tables", "structure"]} className="px-2">
          <AccordionItem value="tables">
            <AccordionTrigger className="text-sm font-medium">Mesas</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2 pb-2">
                {tables.map(renderElement)}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="structure">
            <AccordionTrigger className="text-sm font-medium">Estructura</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2 pb-2">
                {structure.map(renderElement)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="p-4 mt-4 mx-2 bg-muted/50 rounded-lg">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Controles
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Arrastra para añadir</li>
            <li>• Click para seleccionar</li>
            <li>• Esquinas para redimensionar</li>
            <li>• Punto superior para rotar</li>
            <li>• Supr para eliminar</li>
            <li>• Rueda para zoom</li>
          </ul>
        </div>
      </ScrollArea>
    </div>
  );
}