/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';

export interface AdminPlan {
  id: string;
  name: string;
  tier: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
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
  is_active: boolean;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanStatistics {
  total_plans: number;
  active_plans: number;
  free_plans: number;
  premium_plans: number;
  vip_plans: number;
  popular_plans: number;
  total_revenue_potential: number;
}

interface PaginationData {
  page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_prev: boolean;
}

interface AdminPlansResponse {
  success: boolean;
  plans: any[];
  statistics?: PlanStatistics;
  pagination?: PaginationData;
  message?: string;
}

interface DeletePlanResponse {
  success: boolean;
  message?: string;
}

interface FetchPlansParams {
  page?: number;
  per_page?: number;
  search?: string;
  tier?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}

// Helper function to transform API response to AdminPlan format
const transformPlanFromAPI = (planData: any): AdminPlan => {
  return {
    id: planData.id,
    name: planData.name,
    tier: planData.tier,
    description: planData.description || '',
    monthly_price: planData.pricing?.monthly || planData.monthly_price || 0,
    yearly_price: planData.pricing?.yearly || planData.yearly_price || 0,
    currency: planData.pricing?.currency || planData.currency || 'NGN',
    max_messages: planData.features?.max_messages || planData.max_messages || 0,
    max_likes: planData.features?.max_likes || planData.max_likes || 0,
    max_swipes: planData.features?.max_swipes || planData.max_swipes || 0,
    has_advanced_filters: planData.features?.has_advanced_filters || planData.has_advanced_filters || false,
    has_priority_matching: planData.features?.has_priority_matching || planData.has_priority_matching || false,
    has_read_receipts: planData.features?.has_read_receipts || planData.has_read_receipts || false,
    has_verified_badge: planData.features?.has_verified_badge || planData.has_verified_badge || false,
    can_see_who_liked_you: planData.features?.can_see_who_liked_you || planData.can_see_who_liked_you || false,
    can_rewind_swipes: planData.features?.can_rewind_swipes || planData.can_rewind_swipes || false,
    has_incognito_mode: planData.features?.has_incognito_mode || planData.has_incognito_mode || false,
    is_active: planData.is_active !== undefined ? planData.is_active : true,
    is_popular: planData.is_popular || false,
    created_at: planData.created_at,
    updated_at: planData.updated_at || planData.created_at
  };
};

export const useAdminPlans = () => {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<PlanStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const fetchPlans = async (params: FetchPlansParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/admin/plans?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: AdminPlansResponse = await response.json();
      console.log('Fetched plans data:', data);
      
      if (data.success) {
        // Transform the API response to match our AdminPlan interface
        const transformedPlans = data.plans.map(transformPlanFromAPI);
        setPlans(transformedPlans);
        setStatistics(data.statistics || null);
        setPagination(data.pagination || null);
      } else {
        setError(data.message || 'Failed to fetch plans');
      }
    } catch (err: any) {
      console.error('Admin plans fetch error:', err);
      setError(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (planData: Partial<AdminPlan>) => {
    try {
      const response = await fetch('/api/admin/plans/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(planData),
      });

      const data = await response.json();
      
      if (data.success) {
        const transformedPlan = transformPlanFromAPI(data.plan);
        setPlans(prev => [transformedPlan, ...prev]);
        return { success: true, message: 'Plan created successfully', plan: transformedPlan };
      }
      return { success: false, message: data.message || 'Failed to create plan' };
    } catch (err: any) {
      console.error('Create plan error:', err);
      return { success: false, message: err.message || 'Failed to create plan' };
    }
  };

  const updatePlan = async (id: string, planData: Partial<AdminPlan>) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(planData),
      });

      const data = await response.json();
      
      if (data.success) {
        const transformedPlan = transformPlanFromAPI(data.plan);
        setPlans(prev => prev.map(plan => plan.id === id ? transformedPlan : plan));
        return { success: true, message: 'Plan updated successfully', plan: transformedPlan };
      }
      return { success: false, message: data.message || 'Failed to update plan' };
    } catch (err: any) {
      console.error('Update plan error:', err);
      return { success: false, message: err.message || 'Failed to update plan' };
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data: DeletePlanResponse = await response.json();
      
      if (data.success) {
        setPlans(prev => prev.filter(plan => plan.id !== id));
        return { success: true, message: 'Plan deleted successfully' };
      }
      return { success: false, message: data.message || 'Failed to delete plan' };
    } catch (err: any) {
      console.error('Delete plan error:', err);
      return { success: false, message: err.message || 'Failed to delete plan' };
    }
  };

  const activatePlan = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}/activate`, {
        method: 'PATCH',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        const transformedPlan = transformPlanFromAPI(data.plan);
        setPlans(prev => prev.map(plan => plan.id === id ? transformedPlan : plan));
        return { success: true, message: 'Plan activated successfully' };
      }
      return { success: false, message: data.message || 'Failed to activate plan' };
    } catch (err: any) {
      console.error('Activate plan error:', err);
      return { success: false, message: err.message || 'Failed to activate plan' };
    }
  };

  const deactivatePlan = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_active: false }),
      });

      const data = await response.json();
      
      if (data.success) {
        const transformedPlan = transformPlanFromAPI(data.plan);
        setPlans(prev => prev.map(plan => plan.id === id ? transformedPlan : plan));
        return { success: true, message: 'Plan deactivated successfully' };
      }
      return { success: false, message: data.message || 'Failed to deactivate plan' };
    } catch (err: any) {
      console.error('Deactivate plan error:', err);
      return { success: false, message: err.message || 'Failed to deactivate plan' };
    }
  };

  const togglePlanPopular = async (id: string, isPopular: boolean) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_popular: isPopular }),
      });

      const data = await response.json();
      
      if (data.success) {
        const transformedPlan = transformPlanFromAPI(data.plan);
        setPlans(prev => prev.map(plan => plan.id === id ? transformedPlan : plan));
        return { 
          success: true, 
          message: `Plan ${isPopular ? 'marked as popular' : 'removed from popular'} successfully` 
        };
      }
      return { success: false, message: data.message || 'Failed to update plan' };
    } catch (err: any) {
      console.error('Toggle plan popular error:', err);
      return { success: false, message: err.message || 'Failed to update plan' };
    }
  };

  const exportPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'GET',
        credentials: 'include',
      });

      const data: AdminPlansResponse = await response.json();
      if (!data.success) throw new Error(data.message || 'Export failed');

      const transformedPlans = data.plans.map(transformPlanFromAPI);

      const headers = [
        'Plan ID',
        'Name',
        'Tier',
        'Monthly Price',
        'Yearly Price',
        'Currency',
        'Max Messages',
        'Max Likes',
        'Max Swipes',
        'Advanced Filters',
        'Priority Matching',
        'Read Receipts',
        'See Who Liked You',
        'Rewind Swipes',
        'Incognito Mode',
        'Verified Badge',
        'Active',
        'Popular',
        'Created Date'
      ];

      const csv = [headers, ...transformedPlans.map(plan => [
        plan.id,
        plan.name,
        plan.tier,
        plan.monthly_price,
        plan.yearly_price,
        plan.currency,
        plan.max_messages,
        plan.max_likes,
        plan.max_swipes,
        plan.has_advanced_filters ? 'Yes' : 'No',
        plan.has_priority_matching ? 'Yes' : 'No',
        plan.has_read_receipts ? 'Yes' : 'No',
        plan.can_see_who_liked_you ? 'Yes' : 'No',
        plan.can_rewind_swipes ? 'Yes' : 'No',
        plan.has_incognito_mode ? 'Yes' : 'No',
        plan.has_verified_badge ? 'Yes' : 'No',
        plan.is_active ? 'Yes' : 'No',
        plan.is_popular ? 'Yes' : 'No',
        plan.created_at
      ])].map(r => r.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `plans-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err: any) {
      console.error('Export plans error:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return { 
    plans, 
    loading, 
    error, 
    statistics, 
    pagination, 
    fetchPlans, 
    createPlan, 
    updatePlan, 
    deletePlan, 
    activatePlan,
    deactivatePlan,
    togglePlanPopular,
    exportPlans 
  };
};