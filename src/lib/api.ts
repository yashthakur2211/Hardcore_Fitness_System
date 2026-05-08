const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get the server base URL for static assets (removes /api from the end)
export const getServerBaseUrl = (): string => {
  return API_BASE_URL.replace(/\/api$/, '');
};

// Helper function to construct full photo URL
export const getPhotoUrl = (photoPath: string | null | undefined): string | null => {
  if (!photoPath) return null;
  // If already a full URL or data URL, return as-is
  if (photoPath.startsWith('http') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  // Prepend server base URL for relative paths
  return `${getServerBaseUrl()}${photoPath}`;
};

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Helper function to make authenticated requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const errorMessage = error.details || error.error || error.message || `HTTP error! status: ${response.status}`;
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      endpoint: endpoint
    });
    throw new Error(errorMessage);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    return apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  register: async (data: { username: string; email?: string; phone?: string; password: string; role?: string }) => {
    return apiRequest<{ message: string; userId: number }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  checkStatus: async () => {
    return apiRequest<{ hasAdmin: boolean; hasUsers: boolean }>('/auth/status');
  },

  getCurrentUser: async () => {
    return apiRequest<{ user: any }>('/auth/me');
  },
};

// Members API
export const membersAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/members');
  },
  
  getById: async (id: string) => {
    return apiRequest<any>(`/members/${id}`);
  },
  
  create: async (member: any) => {
    return apiRequest<{ message: string; memberId: string }>('/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },
  
  update: async (id: string, member: any) => {
    return apiRequest<{ message: string }>(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  },
  
  patch: async (id: string, updates: any) => {
    return apiRequest<{ message: string }>(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/members/${id}`, {
      method: 'DELETE',
    });
  },
  
  generateId: async () => {
    return apiRequest<{ memberId: string }>('/members/generate/id');
  },
};

// Memberships API
export const membershipsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/memberships');
  },
  
  getByMemberId: async (memberId: string) => {
    return apiRequest<any[]>(`/memberships/member/${memberId}`);
  },
  
  create: async (membership: any) => {
    return apiRequest<{ message: string; id: string }>('/memberships', {
      method: 'POST',
      body: JSON.stringify(membership),
    });
  },
  
  update: async (id: string, membership: any) => {
    return apiRequest<{ message: string }>(`/memberships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(membership),
    });
  },
  
  generateId: async () => {
    return apiRequest<{ id: string }>('/memberships/generate/id');
  },
};

// Payments API
export const paymentsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/payments');
  },

  getByMemberId: async (memberId: string) => {
    return apiRequest<any[]>(`/payments/member/${memberId}`);
  },

  create: async (payment: any) => {
    return apiRequest<{ message: string; id: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  },

  generateId: async () => {
    return apiRequest<{ id: string }>('/payments/generate/id');
  },

  generateReceiptId: async () => {
    return apiRequest<{ receiptId: string }>('/payments/generate/receipt-id');
  },
};

// Receipts API
export const receiptsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/payments/receipts');
  },

  getByReceiptId: async (receiptId: string) => {
    return apiRequest<any>(`/payments/receipts/${encodeURIComponent(receiptId)}`);
  },
};

// Attendance API
export const attendanceAPI = {
  getAll: async (date?: string) => {
    const url = date ? `/attendance?date=${date}` : '/attendance';
    return apiRequest<any[]>(url);
  },
  getRange: async (start: string, end: string) => {
    return apiRequest<any[]>(`/attendance?start=${start}&end=${end}`);
  },
  
  getByMemberId: async (memberId: string) => {
    return apiRequest<any[]>(`/attendance/member/${memberId}`);
  },
  
  mark: async (attendance: any) => {
    return apiRequest<{ message: string; id: string }>('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendance),
    });
  },
  
  generateId: async () => {
    return apiRequest<{ id: string }>('/attendance/generate/id');
  },
};

// Trainers API
export const trainersAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/trainers');
  },
  
  getById: async (id: string) => {
    return apiRequest<any>(`/trainers/${id}`);
  },
  
  create: async (trainer: any) => {
    return apiRequest<{ message: string; trainerId: string }>('/trainers', {
      method: 'POST',
      body: JSON.stringify(trainer),
    });
  },
  
  update: async (id: string, trainer: any) => {
    return apiRequest<{ message: string }>(`/trainers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trainer),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/trainers/${id}`, {
      method: 'DELETE',
    });
  },
  
  generateId: async () => {
    return apiRequest<{ trainerId: string }>('/trainers/generate/id');
  },
};

// Trainer Attendance API
export const trainerAttendanceAPI = {
  getAll: async (date?: string) => {
    const url = date ? `/trainer-attendance?date=${date}` : '/trainer-attendance';
    return apiRequest<any[]>(url);
  },
  getRange: async (start: string, end: string) => {
    return apiRequest<any[]>(`/trainer-attendance?start=${start}&end=${end}`);
  },

  mark: async (attendance: any) => {
    return apiRequest<{ message: string; id: string }>('/trainer-attendance', {
      method: 'POST',
      body: JSON.stringify(attendance),
    });
  },

  checkout: async (trainerId: string) => {
    return apiRequest<{ message: string; checkOutTime: string }>(`/trainer-attendance/${trainerId}/checkout`, {
      method: 'PATCH',
    });
  },

  generateId: async () => {
    return apiRequest<{ id: string }>('/trainer-attendance/generate/id');
  },
};

// Enquiries API
export const enquiriesAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/enquiries');
  },
  
  create: async (enquiry: any) => {
    return apiRequest<{ message: string; id: string }>('/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry),
    });
  },
  
  update: async (id: string, enquiry: any) => {
    return apiRequest<{ message: string }>(`/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enquiry),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/enquiries/${id}`, {
      method: 'DELETE',
    });
  },
  
  generateId: async () => {
    return apiRequest<{ id: string }>('/enquiries/generate/id');
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return apiRequest<{
      pendingFees: number;
      expiring: number;
      expired: number;
      birthdays: number;
      absent: number;
      enquiries: number;
      active: number;
      cancelled: number;
    }>('/dashboard/stats');
  },
  
  getGymInfo: async () => {
    return apiRequest<any>('/dashboard/gym-info');
  },
  
  getFeeStructure: async () => {
    return apiRequest<any[]>('/dashboard/fee-structure');
  },
  updateFeeStructure: async (duration: number, fee: any) => {
    return apiRequest<{ message: string; fees: any[] }>(`/dashboard/fee-structure/${duration}`, {
      method: 'PUT',
      body: JSON.stringify(fee),
    });
  },
};

// Reports API
export const reportsAPI = {
  getOverview: async (params?: { period?: string; year?: number; month?: number; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.append('period', params.period);
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const queryString = searchParams.toString();
    return apiRequest<any>(`/reports/overview${queryString ? `?${queryString}` : ''}`);
  },

  getRevenue: async (params?: { period?: string; year?: number; month?: number; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.append('period', params.period);
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const queryString = searchParams.toString();
    return apiRequest<any[]>(`/reports/revenue${queryString ? `?${queryString}` : ''}`);
  },

  getYears: async () => {
    return apiRequest<number[]>('/reports/years');
  },

  getMembersByStatus: async (status: string) => {
    return apiRequest<any[]>(`/reports/members-by-status?status=${encodeURIComponent(status)}`);
  },

  getPaymentsByDate: async (date: string) => {
    return apiRequest<{ payments: any[]; summary: any }>(`/reports/payments-by-date?date=${encodeURIComponent(date)}`);
  },

  getPaymentsRange: async (startDate: string, endDate: string) => {
    return apiRequest<{ payments: any[]; summary: any; byMode: any[]; daily: any[] }>(
      `/reports/payments-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
  },

  getAuditReport: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();
    return apiRequest<any>(`/reports/audit${qs ? `?${qs}` : ''}`);
  },
};
