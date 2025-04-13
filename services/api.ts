import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface AirQualityData {
  timestamp: number;
  airQuality: number;
  components: {
    co: number;
    no: number;
    no2: number;
    o3: number;
    so2: number;
    pm2_5: number;
    pm10: number;
    nh3: number;
  };
  location: {
    lat: string;
    lon: string;
  };
}

export interface ForecastData {
  forecast: Array<{
    timestamp: number;
    airQuality: number;
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
  }>;
  location: {
    lat: string;
    lon: string;
  };
}

export const airQualityApi = {
  getCurrentAirQuality: async (
    lat?: string,
    lon?: string
  ): Promise<AirQualityData> => {
    const params = new URLSearchParams();
    if (lat) params.append("lat", lat);
    if (lon) params.append("lon", lon);

    const response = await axios.get(`${API_BASE_URL}/current`, {
      params,
    });
    return response.data;
  },

  getAirQualityForecast: async (
    lat?: string,
    lon?: string
  ): Promise<ForecastData> => {
    const params = new URLSearchParams();
    if (lat) params.append("lat", lat);
    if (lon) params.append("lon", lon);

    const response = await axios.get(`${API_BASE_URL}/forecast`, {
      params,
    });
    return response.data;
  },

  getAirQualityComponents: async (
    lat?: string,
    lon?: string
  ): Promise<Record<string, { value: number; unit: string; name: string }>> => {
    const params = new URLSearchParams();
    if (lat) params.append("lat", lat);
    if (lon) params.append("lon", lon);

    const response = await axios.get(`${API_BASE_URL}/components`, {
      params,
    });
    return response.data;
  },
};
