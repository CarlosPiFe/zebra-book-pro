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
  const [mapReady, setMapReady] = useState(false);

  // Initialize map only once
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      console.error('VITE_MAPBOX_PUBLIC_TOKEN no está configurado');
      return;
    }
    setMapboxToken(token);

    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    // Initialize map centered on Madrid by default
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-3.7038, 40.4168],
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapReady(true);
    });

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when businesses or userLocation change
  useEffect(() => {
    if (!mapReady || !map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const businessesWithCoords = businesses.filter(b => b.latitude && b.longitude);

    console.log('🗺️ Actualizando marcadores:', businessesWithCoords.length, 'restaurantes');

    // Add user location marker if exists
    if (userLocation) {
      const userMarkerEl = document.createElement('div');
      userMarkerEl.style.cssText = 'width: 16px; height: 16px; background-color: #3B82F6; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);';
      
      const userMarker = new mapboxgl.Marker({
        element: userMarkerEl,
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
      
      markersRef.current.push(userMarker);
    }

    // Add business markers
    businessesWithCoords.forEach((business) => {
      if (!map.current) return;

      const lng = Number(business.longitude);
      const lat = Number(business.latitude);
      
      if (!isFinite(lng) || !isFinite(lat)) {
        console.warn('⚠️ Coordenadas inválidas:', business.name, lat, lng);
        return;
      }

      // Create card popup
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

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.style.cssText = 'width: 32px; height: 32px; background-color: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;';
      markerEl.innerHTML = `
        <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.1)';
      });
      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      // Create popup
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

      // Add marker to map with correct [lng, lat] order
      const marker = new mapboxgl.Marker({
        element: markerEl,
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);

      console.log('✅ Marcador añadido:', business.name, 'en [lng, lat]:', [lng, lat]);

      markersRef.current.push(marker);
    });

    // Adjust bounds to show all markers
    if (businessesWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      businessesWithCoords.forEach(b => {
        if (b.longitude && b.latitude) {
          bounds.extend([b.longitude, b.latitude]);
        }
      });
      
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }
      
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 15
      });
    } else if (userLocation) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 13
      });
    }
  }, [businesses, userLocation, onBusinessClick, mapReady]);

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
