import { useRef, useEffect, useState } from "react";
import { Canvas as FabricCanvas, Rect, Circle, FabricObject, Line } from "fabric";
import { ElementTemplate } from "./ElementPalette";

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

interface PlanCanvasProps {
  elements: PlacedElement[];
  onElementsChange: (elements: PlacedElement[]) => void;
  onElementSelect: (element: PlacedElement | null) => void;
  draggedTemplate: ElementTemplate | null;
  waiters: any[];
}

const GRID_SIZE = 20;

export function PlanCanvas({ 
  elements, 
  onElementsChange, 
  onElementSelect, 
  draggedTemplate,
  waiters
}: PlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const elementsMapRef = useRef<Map<string, FabricObject>>(new Map());

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "#fafafa",
      selection: true,
    });

    // Draw grid
    drawGrid(canvas);

    // Handle window resize
    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      drawGrid(canvas);
    };
    window.addEventListener('resize', handleResize);

    // Handle zoom with mouse wheel
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 3) newZoom = 3;
      if (newZoom < 0.5) newZoom = 0.5;
      const point = canvas.getScenePoint(opt.e);
      canvas.zoomToPoint(point, newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Handle selection
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj) {
        const data = obj.get('data') as any;
        if (data?.element) {
          onElementSelect(data.element);
        }
      }
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj) {
        const data = obj.get('data') as any;
        if (data?.element) {
          onElementSelect(data.element);
        }
      }
    });

    canvas.on('selection:cleared', () => {
      onElementSelect(null);
    });

    // Handle object modification (move, resize, rotate)
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj) return;

      const data = obj.get('data') as any;
      if (data?.element) {
        const updatedElement: PlacedElement = {
          ...data.element,
          x: snapToGrid(obj.left || 0),
          y: snapToGrid(obj.top || 0),
          width: obj.width || data.element.width,
          height: obj.height || data.element.height,
          rotation: obj.angle || 0,
        };

        const updatedElements = elements.map(el => 
          el.id === updatedElement.id ? updatedElement : el
        );
        onElementsChange(updatedElements);
      }
    });

    setFabricCanvas(canvas);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Draw grid background
  const drawGrid = (canvas: FabricCanvas) => {
    const width = canvas.width || 800;
    const height = canvas.height || 600;

    // Clear previous grid
    const existingGrid = canvas.getObjects().filter((obj: any) => obj.id === 'grid');
    existingGrid.forEach(obj => canvas.remove(obj));

    // Draw vertical lines
    for (let i = 0; i < width; i += GRID_SIZE) {
      const line = new Line([i, 0, i, height], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      (line as any).id = 'grid';
      canvas.insertAt(0, line);
    }

    // Draw horizontal lines
    for (let i = 0; i < height; i += GRID_SIZE) {
      const line = new Line([0, i, width, i], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      (line as any).id = 'grid';
      canvas.insertAt(0, line);
    }
  };

  // Snap to grid helper
  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Render elements on canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    // Clear all non-grid objects
    const objects = fabricCanvas.getObjects().filter((obj: any) => obj.id !== 'grid');
    objects.forEach(obj => fabricCanvas.remove(obj));
    elementsMapRef.current.clear();

    elements.forEach(element => {
      const fabricObj = createFabricObject(element);
      if (fabricObj) {
        elementsMapRef.current.set(element.id, fabricObj);
        fabricCanvas.add(fabricObj);
      }
    });

    fabricCanvas.renderAll();
  }, [elements, fabricCanvas, waiters]);

  // Create Fabric object from element
  const createFabricObject = (element: PlacedElement): FabricObject | null => {
    const isTable = element.type.startsWith('table');
    
    // Get waiter color if assigned
    const assignedWaiter = waiters.find(w => w.id === element.assignedWaiterId);
    const waiterColor = assignedWaiter?.color;

    // Determine colors
    let fillColor = '#3b82f6';
    let strokeColor = '#1e40af';

    if (waiterColor && isTable) {
      fillColor = waiterColor;
      strokeColor = waiterColor;
    } else {
      switch(element.type) {
        case 'wall':
          fillColor = '#6b7280';
          strokeColor = '#374151';
          break;
        case 'column':
          fillColor = '#9ca3af';
          strokeColor = '#6b7280';
          break;
        case 'door':
          fillColor = '#f59e0b';
          strokeColor = '#d97706';
          break;
        case 'plant':
          fillColor = '#10b981';
          strokeColor = '#059669';
          break;
        case 'separator':
          fillColor = '#8b5cf6';
          strokeColor = '#7c3aed';
          break;
      }
    }

    let obj: FabricObject;

    if (element.type === 'table-round') {
      obj = new Circle({
        left: element.x,
        top: element.y,
        radius: element.width / 2,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        angle: element.rotation,
      });
    } else {
      obj = new Rect({
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        angle: element.rotation,
      });
    }

    // Store element data
    obj.set('data', { element });
    
    // Enable controls
    obj.set({
      cornerColor: '#3b82f6',
      cornerSize: 12,
      transparentCorners: false,
      borderColor: '#3b82f6',
      borderScaleFactor: 2,
    });

    return obj;
  };

  // Handle drop from palette
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!fabricCanvas || !draggedTemplate) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = snapToGrid((e.clientX - rect.left) / zoom);
    const y = snapToGrid((e.clientY - rect.top) / zoom);

    const newElement: PlacedElement = {
      id: `element-${Date.now()}`,
      type: draggedTemplate.type,
      x,
      y,
      width: draggedTemplate.defaultWidth,
      height: draggedTemplate.defaultHeight,
      rotation: 0,
    };

    onElementsChange([...elements, newElement]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative bg-background"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <canvas ref={canvasRef} />
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg">
        Zoom: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}