/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAdminPayments.ts
import { useState, useEffect } from 'react';

interface PaymentPlan {
  id: string;
  name: string;
  tier: string;
  description: string;
  is_active: boolean;
  is_popular: boolean;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
    yearly_savings: number;
  };
  features: {
    max_messages: number;
    max_likes: number;
    max_swipes: number;
    has_advanced_filters: boolean;
    has_priority_matching: boolean;
    has_read_receipts: boolean;
    has_verified_badge: boolean;
    can_see_who_liked_you: boolean;
    can_rewind_swipes: boolean;
    has_incognito_mode: boolean;
  };
}

interface PaymentUser {
  id: string;
  username: string;
  name: string;
}

interface PaymentDates {
  created_at: string;
  paid_at: string;
}

interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string;
  provider_reference: string;
  billing_cycle: string;
  dates: PaymentDates;
  plan: PaymentPlan;
  user: PaymentUser;
  user_id: string;
  subscription_id: string | null;
  payment_metadata: any;
}

interface PaymentStatistics {
  total_payments: number;
  completed_payments: number;
  failed_payments: number;
  pending_payments: number;
  refunded_payments: number;
  total_revenue: number;
  success_rate: number;
  revenue_trend: Array<{
    month: string;
    revenue: number;
  }>;
}

interface PaginationData {
  page: number;
  per_page: number;
  total_pages: number;
  total_payments: number;
  has_next: boolean;
  has_prev: boolean;
}

interface AdminPaymentsResponse {
  success: boolean;
  payments: AdminPayment[];
  statistics?: PaymentStatistics;
  pagination?: PaginationData;
  message?: string;
}

interface FetchPaymentsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  method?: string;
  sort_by?: string;
  sort_order?: string;
  date_from?: string;
  date_to?: string;
}

export const useAdminPayments = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const fetchPayments = async (params: FetchPaymentsParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/payments?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AdminPaymentsResponse = await response.json();
      console.log('Fetched payments data:', data);
      
      if (data.success) {
        setPayments(data.payments || []);
        setStatistics(data.statistics || null);
        setPagination(data.pagination || null);
      } else {
        throw new Error(data.message || 'Failed to fetch payments');
      }
    } catch (err: any) {
      console.error('Admin payments fetch error:', err);
      setError(err.message || 'Failed to fetch payments');
      setPayments([]);
      setStatistics(null);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

const exportPayments = async () => {
  try {


    const response = await fetch(`/api/admin/payments`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AdminPaymentsResponse = await response.json();
    
    if (data.success) {
      const headers = [
        'Payment ID',
        'User ID', 
        'Username',
        'Name',
        'Plan Name',
        'Plan Tier',
        'Amount',
        'Currency',
        'Status',
        'Provider',
        'Billing Cycle',
        'Provider Reference',
        'Provider Payment ID',
        'Payment Date',
        'Created Date'
      ];
      
      const csvData = data.payments.map(payment => [
        payment.id,
        payment.user_id,
        payment.user.username,
        payment.user.name || '',
        payment.plan.name,
        payment.plan.tier,
        payment.amount,
        payment.currency,
        payment.status,
        payment.provider,
        payment.billing_cycle,
        payment.provider_reference,
        payment.provider_payment_id,
        payment.dates.paid_at,
        payment.dates.created_at
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lauMeet-payments-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Payments exported successfully' };
    } else {
      return { success: false, message: data.message || 'Failed to export payments' };
    }
  } catch (err: any) {
    console.error('Export payments error:', err);
    return { 
      success: false, 
      message: err.message || 'Failed to export payments' 
    };
  }
};
  const refresh = () => {
    fetchPayments();
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return { 
    payments, 
    loading, 
    error, 
    statistics, 
    pagination, 
    fetchPayments, 
    exportPayments,
    refresh 
  };
};