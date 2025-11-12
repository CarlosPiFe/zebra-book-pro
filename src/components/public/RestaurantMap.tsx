import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

// Fix para los iconos de Leaflet en Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
}

interface RestaurantMapProps {
  businesses: Business[];
  center?: [number, number];
  zoom?: number;
  onBusinessClick?: (businessId: string) => void;
}

export const RestaurantMap = ({
  businesses,
  center,
  zoom = 13,
  onBusinessClick,
}: RestaurantMapProps) => {
  const navigate = useNavigate();

  // Filtrar negocios con coordenadas válidas
  const validBusinesses = businesses.filter(
    (b) => b.latitude && b.longitude
  );

  // Calcular bounds y centro dinámicamente
  const mapConfig = useMemo(() => {
    if (validBusinesses.length === 0) {
      return {
        center: center || [40.4168, -3.7038] as [number, number],
        zoom,
        bounds: undefined,
      };
    }

    // Si hay un centro especificado, usarlo
    if (center) {
      return {
        center,
        zoom,
        bounds: undefined,
      };
    }

    // Calcular bounds automáticamente
    const bounds = L.latLngBounds(
      validBusinesses.map((b) => [b.latitude!, b.longitude!])
    );

    return {
      center: bounds.getCenter() as unknown as [number, number],
      zoom: undefined,
      bounds,
    };
  }, [validBusinesses, center, zoom]);

  const handleMarkerClick = (businessId: string) => {
    if (onBusinessClick) {
      onBusinessClick(businessId);
    } else {
      navigate(`/business/${businessId}`);
    }
  };

  if (validBusinesses.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center space-y-2 p-6">
          <p className="text-muted-foreground">
            No hay restaurantes con ubicación para mostrar en el mapa
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapConfig.center}
        zoom={mapConfig.zoom || 13}
        bounds={mapConfig.bounds}
        boundsOptions={{ padding: [50, 50], maxZoom: 14 }}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validBusinesses.map((business) => (
          <Marker
            key={business.id}
            position={[business.latitude!, business.longitude!]}
            eventHandlers={{
              click: () => handleMarkerClick(business.id),
            }}
          >
            <Popup>
              <div className="min-w-[200px] p-2">
                {business.image_url && (
                  <img
                    src={business.image_url}
                    alt={business.name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <h3 className="font-semibold text-base mb-1">
                  {business.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {business.cuisine_type || "Restaurante"}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">
                      {business.average_rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <span className="text-gray-400">·</span>
                  <span className="font-semibold text-green-600">
                    {business.price_range || "€€"}
                  </span>
                </div>
                <button
                  onClick={() => handleMarkerClick(business.id)}
                  className="mt-2 w-full bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/90"
                >
                  Ver detalles
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
