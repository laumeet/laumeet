/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/usePaymentHistory.ts
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'partially_refunded';
  provider: string;
  provider_reference?: string;
  provider_payment_id?: string;
  billing_cycle: string;
  plan?: {
    name: string;
    tier: string;
  };
  dates: {
    created_at: string;
    paid_at?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
}

interface PaymentHistoryResponse {
  success: boolean;
  payments: Payment[];
  pagination: Pagination;
}

export const usePaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    has_next: false,
    has_prev: false
  });

  const fetchPaymentHistory = async (page: number = 1, limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<PaymentHistoryResponse>(
        `/subscription/payments?page=${page}&limit=${limit}`
      );
      
      if (response.data.success) {
        setPayments(response.data.payments || []);
        setPagination(response.data.pagination || {
          page,
          limit,
          total: 0,
          has_next: false,
          has_prev: false
        });
      } else {
        setError('Failed to fetch payment history');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch payment history';
      setError(errorMessage);
      console.error('Error fetching payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchPaymentHistory(pagination.page, pagination.limit);
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  return {
    payments,
    loading,
    error,
    pagination,
    fetchPaymentHistory,
    refresh
  };
};