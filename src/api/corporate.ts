import { api } from '../lib/apiClient';
import type { Booking, CorporateAccount, Profile } from '../types/api';

export const corporateApi = {
  account: () => api.get<{ account: CorporateAccount }>('/corporate/account').then((r) => r.account),
  employees: () => api.get<{ employees: Profile[] }>('/corporate/employees').then((r) => r.employees),
  bookings: (approvalStatus?: string) =>
    api
      .get<{ bookings: Booking[] }>(`/corporate/bookings${approvalStatus ? `?approvalStatus=${approvalStatus}` : ''}`)
      .then((r) => r.bookings),
  approveBooking: (id: string) => api.post<{ booking: Booking }>(`/corporate/bookings/${id}/approve`).then((r) => r.booking),
  rejectBooking: (id: string) => api.post<{ booking: Booking }>(`/corporate/bookings/${id}/reject`).then((r) => r.booking),
  spendingReport: () =>
    api
      .get<{ report: { month: string; total_spent: string; trip_count: string }[] }>('/corporate/reports/spending')
      .then((r) => r.report),
};
