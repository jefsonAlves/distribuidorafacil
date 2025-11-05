// FASE 9: Mapa e Visualização de Rota para Motorista
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { geocodeAddress, calculateRoute, formatDistance, formatDuration } from "@/lib/geocoding";
import { toast } from "sonner";

interface RouteMapProps {
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode?: string;
  };
  driverLocation?: {
    lat: number;
    lng: number;
  };
}

export const RouteMap = ({ address, driverLocation }: RouteMapProps) => {
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDestinationCoordinates();
  }, [address]);

  useEffect(() => {
    if (destination && driverLocation) {
      calculateRouteInfo();
    }
  }, [destination, driverLocation]);

  const loadDestinationCoordinates = async () => {
    setLoading(true);
    try {
      const fullAddress = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}, ${address.state}`;
      const coords = await geocodeAddress(fullAddress);
      
      if (coords) {
        setDestination(coords);
      } else {
        toast.error("Não foi possível localizar o endereço no mapa");
      }
    } catch (error) {
      console.error("Erro ao geocodificar endereço:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRouteInfo = async () => {
    if (!destination || !driverLocation) return;

    try {
      const route = await calculateRoute(driverLocation, destination);
      if (route) {
        setRouteInfo(route);
      }
    } catch (error) {
      console.error("Erro ao calcular rota:", error);
    }
  };

  const openInGoogleMaps = () => {
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    window.open(url, "_blank");
  };

  const openInWaze = () => {
    if (!destination) return;
    const url = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
    window.open(url, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Navegação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Endereço de Entrega:</p>
          <p className="text-sm text-muted-foreground">
            {address.street}, {address.number} - {address.neighborhood}
          </p>
          <p className="text-sm text-muted-foreground">
            {address.city}/{address.state}
            {address.zipCode && ` - CEP: ${address.zipCode}`}
          </p>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground">
            Calculando rota...
          </div>
        )}

        {routeInfo && !loading && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Distância</p>
              <p className="text-lg font-bold">{formatDistance(routeInfo.distance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo Estimado</p>
              <p className="text-lg font-bold">{formatDuration(routeInfo.duration)}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={openInGoogleMaps}
            disabled={!destination}
            className="flex-1"
            variant="default"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Google Maps
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
          <Button
            onClick={openInWaze}
            disabled={!destination}
            className="flex-1"
            variant="secondary"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Waze
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>

        {destination && (
          <p className="text-xs text-muted-foreground text-center">
            Coordenadas: {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
