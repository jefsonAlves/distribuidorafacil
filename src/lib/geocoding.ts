// FASE 9: Geocoding e Roteamento

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const fetchAddressFromCEP = async (cep: string): Promise<ViaCEPResponse | null> => {
  try {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return null;

    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();

    if (data.erro) return null;
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

interface Coordinates {
  lat: number;
  lng: number;
}

export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'DeliveryApp/1.0',
        },
      }
    );
    const data = await response.json();

    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    return null;
  }
};

interface RouteInfo {
  distance: number; // em metros
  duration: number; // em segundos
}

export const calculateRoute = async (
  from: Coordinates,
  to: Coordinates
): Promise<RouteInfo | null> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    );
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
    };
  } catch (error) {
    console.error('Erro ao calcular rota:', error);
    return null;
  }
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
};
