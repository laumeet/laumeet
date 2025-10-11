/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/plans/page.tsx
"use client"
import React, { useState } from 'react';
import { AdminPlan, useAdminPlans } from '@/hooks/useAdminPlans';
import { 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown,
  DollarSign,
  CheckCircle,
  BarChart3,
  Crown,
  Users,
  Zap,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  Play,
  Pause,
  Star,
  StarOff,
  AlertCircle,
  X,
  Save
} from 'lucide-react';

interface PlanFormData {
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
  is_popular: boolean;
}

const AdminPlansPage = () => {
  const { 
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
  } = useAdminPlans();

  const [filters, setFilters] = useState({
    search: '',
    tier: '',
    status: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    tier: 'free',
    description: '',
    monthly_price: 0,
    yearly_price: 0,
    currency: 'NGN',
    max_messages: 50,
    max_likes: 100,
    max_swipes: 200,
    has_advanced_filters: false,
    has_priority_matching: false,
    has_read_receipts: false,
    has_verified_badge: false,
    can_see_who_liked_you: false,
    can_rewind_swipes: false,
    has_incognito_mode: false,
    is_popular: false
  });

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchPlans({ ...newFilters, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchPlans({ ...filters, page: newPage });
  };

  const handleFormChange = (field: keyof PlanFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tier: 'free',
      description: '',
      monthly_price: 0,
      yearly_price: 0,
      currency: 'NGN',
      max_messages: 50,
      max_likes: 100,
      max_swipes: 200,
      has_advanced_filters: false,
      has_priority_matching: false,
      has_read_receipts: false,
      has_verified_badge: false,
      can_see_who_liked_you: false,
      can_rewind_swipes: false,
      has_incognito_mode: false,
      is_popular: false
    });
  };

  const handleCreatePlan = async () => {
    setActionLoading('create');
    const result = await createPlan(formData);
    setActionLoading(null);
    
    if (result.success) {
      setShowCreateModal(false);
      resetForm();
      showSuccess('Plan created successfully!');
    } else {
      alert(result.message || 'Failed to create plan');
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    setActionLoading(editingPlan.id);
    const result = await updatePlan(editingPlan.id, formData);
    setActionLoading(null);
    
    if (result.success) {
      setEditingPlan(null);
      resetForm();
      showSuccess('Plan updated successfully!');
    } else {
      alert(result.message || 'Failed to update plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    setActionLoading(id);
    const result = await deletePlan(id);
    setActionLoading(null);
    
    if (result.success) {
      showSuccess('Plan deleted successfully!');
    } else {
      alert(result.message || 'Failed to delete plan');
    }
  };

  const handleActivatePlan = async (id: string) => {
    setActionLoading(id);
    const result = await activatePlan(id);
    setActionLoading(null);
    
    if (result.success) {
      showSuccess('Plan activated successfully!');
    } else {
      alert(result.message || 'Failed to activate plan');
    }
  };

  const handleDeactivatePlan = async (id: string) => {
    setActionLoading(id);
    const result = await deactivatePlan(id);
    setActionLoading(null);
    
    if (result.success) {
      showSuccess('Plan deactivated successfully!');
    } else {
      alert(result.message || 'Failed to deactivate plan');
    }
  };

  const handleTogglePopular = async (id: string, isPopular: boolean) => {
    setActionLoading(id);
    const result = await togglePlanPopular(id, isPopular);
    setActionLoading(null);
    
    if (result.success) {
      showSuccess(`Plan ${isPopular ? 'marked as popular' : 'removed from popular'}!`);
    } else {
      alert(result.message || 'Failed to update plan');
    }
  };

  const openEditModal = (plan: AdminPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      tier: plan.tier,
      description: plan.description || '',
      monthly_price: plan.monthly_price,
      yearly_price: plan.yearly_price,
      currency: plan.currency,
      max_messages: plan.max_messages,
      max_likes: plan.max_likes,
      max_swipes: plan.max_swipes,
      has_advanced_filters: plan.has_advanced_filters,
      has_priority_matching: plan.has_priority_matching,
      has_read_receipts: plan.has_read_receipts,
      has_verified_badge: plan.has_verified_badge,
      can_see_who_liked_you: plan.can_see_who_liked_you,
      can_rewind_swipes: plan.can_rewind_swipes,
      has_incognito_mode: plan.has_incognito_mode,
      is_popular: plan.is_popular
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTierBadge = (tier: string) => {
    const tierConfig: { [key: string]: { color: string; icon: React.ReactNode } } = {
      free: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: <Users className="w-3 h-3 mr-1" />
      },
      premium: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: <Crown className="w-3 h-3 mr-1" />
      },
      vip: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        icon: <Zap className="w-3 h-3 mr-1" />
      },
    };

    const config = tierConfig[tier?.toLowerCase()] || tierConfig.free;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {tier}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        Inactive
      </span>
    );
  };

  if (loading && !plans.length) {
    return (
      <div className="min-h-screen  p-4">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className=" border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
            <p className="text-gray-600 text-sm">Manage and configure subscription plans</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={exportPlans}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button 
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className=" rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Plans</p>
                <p className="text-xl font-bold text-white">
                  {statistics.total_plans}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{statistics.active_plans} active</p>
          </div>

          <div className=" rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Potential</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(statistics.total_revenue_potential, 'NGN')}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Total potential</p>
          </div>

          <div className=" rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Premium Plans</p>
                <p className="text-xl font-bold text-white">
                  {statistics.premium_plans}
                </p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Crown className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{statistics.popular_plans} popular</p>
          </div>

          <div className=" rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Free Plans</p>
                <p className="text-xl font-bold text-white">
                  {statistics.free_plans}
                </p>
              </div>
              <div className="bg-gray-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Basic offerings</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className=" border-b border-gray-200 p-4">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plans..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg hover:"
          >
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              {/* Tier Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={filters.tier}
                  onChange={(e) => handleFilterChange('tier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Sort */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={`${filters.sort_by}-${filters.sort_order}`}
                  onChange={(e) => {
                    const [sort_by, sort_order] = e.target.value.split('-');
                    handleFilterChange('sort_by', sort_by);
                    handleFilterChange('sort_order', sort_order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="monthly_price-desc">Price: High to Low</option>
                  <option value="monthly_price-asc">Price: Low to High</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchPlans(filters)}
              className="mt-2 flex items-center space-x-1 text-red-800 text-sm font-medium hover:text-red-900"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="p-4">
        {plans.length === 0 ? (
          <div className="text-center py-12  rounded-lg border border-gray-200">
            <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No plans found</h3>
            <p className="text-gray-500 mb-4">No plans match your current filters.</p>
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  tier: '',
                  status: '',
                  sort_by: 'created_at',
                  sort_order: 'desc'
                });
                fetchPlans();
              }}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className=" rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {getTierBadge(plan.tier)}
                      {plan.is_popular && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          <Zap className="w-3 h-3 mr-1" />
                          Popular
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white break-words">{plan.name}</h3>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    {getStatusBadge(plan.is_active)}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleTogglePopular(plan.id, !plan.is_popular)}
                        disabled={actionLoading === plan.id}
                        className="p-1 text-gray-400 hover:text-yellow-600 transition-colors disabled:opacity-50"
                        title={plan.is_popular ? 'Remove from popular' : 'Mark as popular'}
                      >
                        {plan.is_popular ? <Star className="w-4 h-4 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => openEditModal(plan)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit plan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {plan.is_active ? (
                        <button 
                          onClick={() => handleDeactivatePlan(plan.id)}
                          disabled={actionLoading === plan.id}
                          className="p-1 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-50"
                          title="Deactivate plan"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleActivatePlan(plan.id)}
                          disabled={actionLoading === plan.id}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                          title="Activate plan"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={actionLoading === plan.id}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {actionLoading === plan.id && (
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{plan.description}</p>

                {/* Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(plan.monthly_price, plan.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Yearly</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(plan.yearly_price, plan.currency)}
                    </p>
                    {plan.yearly_price > 0 && plan.monthly_price > 0 && (
                      <p className="text-xs text-green-600">
                        Save {Math.round((1 - plan.yearly_price / (plan.monthly_price * 12)) * 100)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Messages:</span>
                    <span className="font-medium ml-1">{plan.max_messages === -1 ? 'Unlimited' : plan.max_messages}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Likes:</span>
                    <span className="font-medium ml-1">{plan.max_likes === -1 ? 'Unlimited' : plan.max_likes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Swipes:</span>
                    <span className="font-medium ml-1">{plan.max_swipes === -1 ? 'Unlimited' : plan.max_swipes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">Advanced Features:</span>
                    <span className="font-medium ml-1">{plan.has_advanced_filters ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-xs text-gray-500">
                    Created {formatDate(plan.created_at)}
                  </p>
                  <p className="text-xs text-gray-500 font-mono truncate">ID: {plan.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.has_prev}
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg border ${
                pagination.has_prev
                  ? 'border-gray-300 text-gray-700 hover:'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.total_pages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.has_next}
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg border ${
                pagination.has_next
                  ? 'border-gray-300 text-gray-700 hover:'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading for pagination */}
        {loading && plans.length > 0 && (
          <div className="mt-4 flex justify-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Create/Edit Plan Modal */}
      {(showCreateModal || editingPlan) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className=" rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter plan name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => handleFormChange('tier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter plan description"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_price}
                    onChange={(e) => handleFormChange('monthly_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.yearly_price}
                    onChange={(e) => handleFormChange('yearly_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleFormChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Messages</label>
                  <input
                    type="number"
                    value={formData.max_messages}
                    onChange={(e) => handleFormChange('max_messages', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Likes</label>
                  <input
                    type="number"
                    value={formData.max_likes}
                    onChange={(e) => handleFormChange('max_likes', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Swipes</label>
                  <input
                    type="number"
                    value={formData.max_swipes}
                    onChange={(e) => handleFormChange('max_swipes', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.has_advanced_filters}
                    onChange={(e) => handleFormChange('has_advanced_filters', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Advanced Filters</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.has_priority_matching}
                    onChange={(e) => handleFormChange('has_priority_matching', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Priority Matching</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.has_read_receipts}
                    onChange={(e) => handleFormChange('has_read_receipts', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Read Receipts</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_see_who_liked_you}
                    onChange={(e) => handleFormChange('can_see_who_liked_you', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">See Who Liked You</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_rewind_swipes}
                    onChange={(e) => handleFormChange('can_rewind_swipes', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Rewind Swipes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.has_incognito_mode}
                    onChange={(e) => handleFormChange('has_incognito_mode', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Incognito Mode</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.has_verified_badge}
                    onChange={(e) => handleFormChange('has_verified_badge', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Verified Badge</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_popular}
                    onChange={(e) => handleFormChange('is_popular', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as Popular</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-2 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                disabled={actionLoading === (editingPlan ? editingPlan.id : 'create') || !formData.name}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {actionLoading === (editingPlan ? editingPlan.id : 'create') 
                    ? (editingPlan ? 'Updating...' : 'Creating...') 
                    : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlansPage;