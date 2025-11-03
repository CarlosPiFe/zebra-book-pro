import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fullScreen?: boolean;
  text?: string;
  delay?: number; // Delay en ms antes de mostrar el spinner
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

export function LoadingSpinner({ 
  size = "md", 
  className,
  fullScreen = false,
  text,
  delay = 200 // Por defecto 200ms de delay
}: LoadingSpinnerProps) {
  const [showSpinner, setShowSpinner] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // No mostrar nada si aún no ha pasado el delay
  if (!showSpinner) {
    return null;
  }
  const spinner = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      fullScreen && "min-h-[400px]",
      className
    )}>
      <Loader2 
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size]
        )} 
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Componente para overlay de carga en secciones
export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
