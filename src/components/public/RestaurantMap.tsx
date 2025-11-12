import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Business {
  id: string;
  name: string;
  cuisine_type: string | null;
  address?: string | null;
  image_url?: string | null;
  price_range?: string | null;
  average_rating?: number | null;
}

interface RestaurantMapProps {
  businesses: Business[];
  onBusinessClick?: (businessId: string) => void;
}

export const RestaurantMap = ({ businesses, onBusinessClick }: RestaurantMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");

  useEffect(() => {
    // Usar un token público temporal para desarrollo
    // En producción, esto debería venir de variables de entorno
    const token = "pk.eyJ1IjoiemVicmF0aW1lIiwiYSI6ImNtM3JkNXZ2NzBhcm4ya3M5dWpwdGw4emsifQ.example";
    setMapboxToken(token);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    // Coordenadas de España como centro por defecto
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-3.7038, 40.4168], // Madrid
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Geocodificar direcciones simuladas (en producción usar Geocoding API real)
    businesses.forEach((business) => {
      if (!business.address) return;

      // Coordenadas simuladas alrededor de Madrid
      const lat = 40.4168 + (Math.random() - 0.5) * 0.1;
      const lng = -3.7038 + (Math.random() - 0.5) * 0.1;

      // Crear elemento del marcador personalizado
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "auto";
      el.style.height = "auto";
      el.style.cursor = "pointer";
      
      const rating = business.average_rating || 0;
      const priceRange = business.price_range || "€€";
      
      el.innerHTML = `
        <div class="bg-background border-2 border-primary rounded-lg px-3 py-2 shadow-lg hover:shadow-xl transition-shadow">
          <div class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
            <span class="text-primary">${rating.toFixed(1)}</span>
            <span class="text-muted-foreground">·</span>
            <span class="text-foreground">${priceRange}</span>
          </div>
        </div>
      `;

      // Crear popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2" style="min-width: 200px;">
          ${business.image_url ? `<img src="${business.image_url}" alt="${business.name}" class="w-full h-32 object-cover rounded-lg mb-2" />` : ""}
          <h3 class="font-semibold text-base mb-1">${business.name}</h3>
          <p class="text-sm text-muted-foreground">${business.cuisine_type || 'Restaurante'}</p>
          <div class="flex items-center gap-2 text-sm">
            <div class="flex items-center gap-1">
              <span class="text-yellow-500">⭐</span>
              <span class="font-semibold">${rating.toFixed(1)}</span>
            </div>
            <span class="text-gray-400">·</span>
            <span class="font-semibold text-green-600">${priceRange}</span>
          </div>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener("click", () => {
        if (onBusinessClick) {
          onBusinessClick(business.id);
        }
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, businesses, onBusinessClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      {!mapboxToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Cargando mapa...</p>
            <p className="text-xs text-muted-foreground">
              (En desarrollo: configurar token de Mapbox)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
