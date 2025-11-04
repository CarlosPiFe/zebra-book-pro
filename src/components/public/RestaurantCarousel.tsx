import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestaurantCard } from "./RestaurantCard";
import { supabase } from "@/integrations/supabase/client";

interface Business {
  id: string;
  name: string;
  category: string;
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

export const RestaurantCarousel = ({ title, filter = "all" }: RestaurantCarouselProps) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, [filter]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true);

      if (filter === "newest") {
        query = query.order("created_at", { ascending: false }).limit(10);
      } else if (filter === "offers") {
        query = query.not("special_offer", "is", null).limit(10);
      } else if (filter === "featured") {
        query = query.order("average_rating", { ascending: false }).limit(10);
      } else {
        query = query.limit(10);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error loading businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById(`carousel-${title}`);
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const newPosition = direction === "left" 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);

    container.scrollTo({ left: newPosition, behavior: "smooth" });
    setScrollPosition(newPosition);
  };

  if (loading || businesses.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            disabled={scrollPosition === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        id={`carousel-${title}`}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {businesses.map((business) => (
          <div key={business.id} className="flex-none w-[280px]">
            <RestaurantCard business={business} />
          </div>
        ))}
      </div>
    </div>
  );
};