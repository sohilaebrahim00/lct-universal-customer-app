import { api } from '../lib/apiClient';
import type { Vehicle } from '../types/api';

export const vehiclesApi = {
  list: () => api.get<{ vehicles: Vehicle[] }>('/vehicles', { auth: false }).then((r) => r.vehicles),
  get: (id: string) => api.get<{ vehicle: Vehicle }>(`/vehicles/${id}`, { auth: false }).then((r) => r.vehicle),
};
