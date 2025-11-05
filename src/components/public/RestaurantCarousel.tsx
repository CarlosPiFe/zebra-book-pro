import { useState, useEffect } from "react";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestaurantCard } from "./RestaurantCard";
import { supabase } from "@/integrations/supabase/client";
interface Business {
  id: string;
  name: string;
  cuisine_type: string | null;
  description?: string | null;
  address?: string | null;
  image_url?: string | null;
  price_range?: string | null;
  average_rating?: number | null;
  special_offer?: string | null;
  created_at: string;
}
interface RestaurantCarouselProps {
  title: string;
  filter?: "featured" | "newest" | "offers" | "all";
}
export const RestaurantCarousel = ({
  title,
  filter = "all"
}: RestaurantCarouselProps) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadBusinesses();
  }, [filter]);
  useEffect(() => {
    checkScrollPosition();
  }, [businesses]);
  const checkScrollPosition = () => {
    const container = containerRef.current;
    if (!container) return;
    const {
      scrollLeft,
      scrollWidth,
      clientWidth
    } = container;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const {
      scrollLeft,
      scrollWidth,
      clientWidth
    } = e.currentTarget;
    setScrollPosition(scrollLeft);
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  const loadBusinesses = async () => {
    setLoading(true);
    try {
      // Aumentar el límite para tener más variedad y luego aleatorizar
      let query = supabase.from("businesses").select("*").eq("is_active", true);
      if (filter === "newest") {
        query = query.order("created_at", {
          ascending: false
        }).limit(20);
      } else if (filter === "offers") {
        query = query.not("special_offer", "is", null).limit(20);
      } else if (filter === "featured") {
        query = query.order("average_rating", {
          ascending: false
        }).limit(20);
      } else {
        query = query.limit(20);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      
      // Aleatorizar el orden para dar más variedad
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      // Tomar solo 10 después de mezclar
      setBusinesses(shuffled.slice(0, 10));
    } catch (error) {
      console.error("Error loading businesses:", error);
    } finally {
      setLoading(false);
    }
  };
  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById(`carousel-${title}`);
    if (!container) return;

    // Calcular el ancho para mostrar exactamente 4 cards (con gaps)
    const cardWidth = 260; // ancho de cada card
    const gap = 12; // gap-3 = 12px
    const scrollAmount = cardWidth * 4 + gap * 3; // 4 cards + 3 gaps

    const newPosition = direction === "left" ? Math.max(0, scrollPosition - scrollAmount) : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
    container.scrollTo({
      left: newPosition,
      behavior: "smooth"
    });
    setScrollPosition(newPosition);
  };
  if (loading || businesses.length === 0) return null;
  return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold md:text-3xl">{title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll("left")} disabled={scrollPosition === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        {/* Degradado izquierdo - solo visible cuando se puede hacer scroll a la izquierda */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none transition-opacity duration-300" style={{
        background: 'linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 30%, transparent 100%)',
        opacity: canScrollLeft ? 1 : 0
      }} />
        
        {/* Degradado derecho - solo visible cuando se puede hacer scroll a la derecha */}
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none transition-opacity duration-300" style={{
        background: 'linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 30%, transparent 100%)',
        opacity: canScrollRight ? 1 : 0
      }} />
        
        <div ref={containerRef} id={`carousel-${title}`} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2" style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }} onScroll={handleScroll}>
          {businesses.map(business => <div key={business.id} className="flex-none w-[260px]">
              <RestaurantCard business={business} />
            </div>)}
        </div>
      </div>
    </div>;
};