import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { formatDistance } from "@/lib/distance";

interface Business {
  id: string;
  name: string;
  cuisine_type: string | null;
  address?: string | null;
  image_url?: string | null;
  price_range?: string | null;
  average_rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
}

interface RestaurantMapProps {
  businesses: Business[];
  onBusinessClick?: (businessId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export const RestaurantMap = ({ businesses, onBusinessClick, userLocation }: RestaurantMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState("");

  useEffect(() => {
    // Usar el token del usuario desde Secrets
    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      console.error('VITE_MAPBOX_PUBLIC_TOKEN no está configurado');
    }
    setMapboxToken(token || '');
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Función para geocodificar dirección usando Mapbox API
    const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          console.log(`✅ Geocodificado: ${address} -> [${lng}, ${lat}]`);
          return [lng, lat];
        }
        console.warn(`⚠️ No se pudo geocodificar: ${address}`);
        return null;
      } catch (error) {
        console.error(`❌ Error geocodificando ${address}:`, error);
        return null;
      }
    };

    // Geocodificar todos los restaurantes con dirección
    const geocodeBusinesses = async () => {
      const geocodedBusinesses = await Promise.all(
        businesses.map(async (business) => {
          if (!business.address) return { ...business, geocoded: false };
          
          const coords = await geocodeAddress(business.address);
          if (coords) {
            return {
              ...business,
              longitude: coords[0],
              latitude: coords[1],
              geocoded: true
            };
          }
          return { ...business, geocoded: false };
        })
      );
      
      return geocodedBusinesses.filter(b => b.geocoded && b.latitude && b.longitude);
    };

    let center: [number, number] = [-3.7038, 40.4168]; // Madrid por defecto
    let zoom = 12;

    // Initialize map first
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Ensure proper sizing and marker projection
    const doResize = () => {
      try { map.current?.resize(); } catch (e) { /* noop */ }
    };

    // Resize after load and on next ticks (helps with sticky/hidden containers)
    map.current.on('load', doResize);
    map.current.on('style.load', doResize);
    setTimeout(doResize, 50);
    setTimeout(doResize, 200);

    // Observe container size changes
    let ro: ResizeObserver | null = null;
    if (mapContainer.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => doResize());
      ro.observe(mapContainer.current);
    }

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Añadir marcador de usuario si existe
    if (userLocation) {
      const userMarkerEl = document.createElement('div');
      userMarkerEl.className = 'w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg';
      
      const userMarker = new mapboxgl.Marker({
        element: userMarkerEl,
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
      
      markersRef.current.push(userMarker);
    }

    // Geocodificar y añadir marcadores
    geocodeBusinesses().then((businessesWithCoords) => {
      console.log('🗺️ Restaurantes geocodificados:', businessesWithCoords.length);
      
      // Ajustar centro del mapa según ubicación de usuario o restaurantes
      if (userLocation) {
        map.current?.setCenter([userLocation.lng, userLocation.lat]);
        map.current?.setZoom(13);
      } else if (businessesWithCoords.length > 0) {
        const lngs = businessesWithCoords.map(b => b.longitude!);
        const lats = businessesWithCoords.map(b => b.latitude!);
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        map.current?.setCenter([avgLng, avgLat]);
      }

      // Add markers for each business with coordinates
      businessesWithCoords.forEach((business) => {
      if (!map.current) return;

      console.log('📍 Renderizando marcador:', {
        name: business.name,
        lat: business.latitude,
        lng: business.longitude,
        address: business.address
      });

      // Crear mini-tarjeta flotante estilo The Fork
      const cardEl = document.createElement('div');
      cardEl.className = 'bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow w-64 border border-border';
      
      cardEl.innerHTML = `
        <div class="relative h-32">
          ${business.image_url 
            ? `<img src="${business.image_url}" alt="${business.name}" class="w-full h-full object-cover" />`
            : `<div class="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Sin imagen</div>`
          }
          ${business.distance ? `<div class="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-foreground shadow-sm">${formatDistance(business.distance)}</div>` : ''}
        </div>
        <div class="p-3 space-y-2">
          <h3 class="font-semibold text-sm text-foreground line-clamp-1">${business.name}</h3>
          <p class="text-xs text-muted-foreground line-clamp-1">${business.cuisine_type || 'Restaurante'}</p>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              ${business.average_rating 
                ? `<span class="text-xs font-semibold text-foreground">${business.average_rating.toFixed(1)}</span>
                   <svg class="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
                : '<span class="text-xs text-muted-foreground">Sin valoraciones</span>'
              }
            </div>
            ${business.price_range 
              ? `<span class="text-xs font-semibold text-foreground">${business.price_range}</span>`
              : ''
            }
          </div>
        </div>
      `;

      // Crear marcador personalizado (pelota azul)
      const markerEl = document.createElement('div');
      markerEl.className = 'relative group';
      markerEl.innerHTML = `
        <div style="width: 32px; height: 32px; background-color: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;">
          <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      // Popup con la tarjeta
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: 'none',
      }).setDOMContent(cardEl);

      cardEl.addEventListener('click', () => {
        if (onBusinessClick) {
          onBusinessClick(business.id);
        }
      });

      const lat = Number(business.latitude);
      const lng = Number(business.longitude);
      if (!isFinite(lat) || !isFinite(lng)) {
        console.warn('⚠️ Coordenadas inválidas para', business.name, business.latitude, business.longitude);
        return;
      }

      const marker = new mapboxgl.Marker({
        element: markerEl,
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);

      console.log('✅ Marcador añadido al mapa:', business.name, 'en posición [lng, lat]:', [lng, lat]);

        markersRef.current.push(marker);
      });

      // Ajustar bounds si hay múltiples restaurantes
      if (businessesWithCoords.length > 1 && map.current) {
        const bounds = new mapboxgl.LngLatBounds();
        businessesWithCoords.forEach(b => {
          bounds.extend([b.longitude!, b.latitude!]);
        });
        if (userLocation) {
          bounds.extend([userLocation.lng, userLocation.lat]);
        }
        map.current.fitBounds(bounds, { padding: 50 });
      }
    });

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      try { ro?.disconnect(); } catch {}
      map.current?.remove();
    };
  }, [mapboxToken, businesses, onBusinessClick, userLocation]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
    </div>
  );
};
