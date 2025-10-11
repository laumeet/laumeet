/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/payments/page.tsx
'use client';
import React, { useState } from 'react';
import { useAdminPayments } from '@/hooks/useAdminPayments';
import { 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown,
  DollarSign,
  CheckCircle,
  CreditCard,
  User,
  Calendar,
  Package,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Crown
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string;
  provider_reference: string;
  billing_cycle: string;
  dates: {
    created_at: string;
    paid_at: string;
  };
  plan: {
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
  };
  user: {
    id: string;
    username: string;
    name: string;
  };
  user_id: string;
  subscription_id: string | null;
  payment_metadata: any;
}

const AdminPaymentsPage = () => {
  const { payments, loading, error, statistics, pagination, fetchPayments, exportPayments } = useAdminPayments();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    method: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchPayments({ ...newFilters, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchPayments({ ...filters, page: newPage });
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; text: string; icon: React.ReactNode } } = {
      completed: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        text: 'Completed',
        icon: <CheckCircle className="w-3 h-3 mr-1" />
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        text: 'Pending',
        icon: <RefreshCw className="w-3 h-3 mr-1" />
      },
      failed: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        text: 'Failed',
        icon: <AlertCircle className="w-3 h-3 mr-1" />
      },
      refunded: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        text: 'Refunded',
        icon: <RefreshCw className="w-3 h-3 mr-1" />
      },
    };

    const config = statusConfig[status?.toLowerCase() || ''] || { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      text: status || 'Unknown',
      icon: <AlertCircle className="w-3 h-3 mr-1" />
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const getMethodIcon = (provider: string) => {
    const providerIcons: { [key: string]: React.ReactNode } = {
      flutterwave: <CreditCard className="w-5 h-5 text-orange-600" />,
      paystack: <CreditCard className="w-5 h-5 text-green-600" />,
      stripe: <CreditCard className="w-5 h-5 text-blue-600" />,
    };
    
    return providerIcons[provider?.toLowerCase() || ''] || <CreditCard className="w-5 h-5 text-gray-600" />;
  };

  const getPlanTierIcon = (tier: string) => {
    const tierIcons: { [key: string]: React.ReactNode } = {
      free: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
      premium: <Crown className="w-3 h-3 text-yellow-600" />,
      vip: <Crown className="w-3 h-3 text-purple-600" />,
    };
    
    return tierIcons[tier?.toLowerCase() || 'free'] || <div className="w-2 h-2 bg-gray-400 rounded-full" />;
  };

  const getPlanTierColor = (tier: string) => {
    const tierColors: { [key: string]: string } = {
      free: 'text-gray-600 bg-gray-100',
      premium: 'text-yellow-700 bg-yellow-100',
      vip: 'text-purple-700 bg-purple-100',
    };
    
    return tierColors[tier?.toLowerCase() || 'free'] || 'text-gray-600 bg-gray-100';
  };

  if (loading && !payments.length) {
    return (
      <div className="min-h-screen  p-4">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="text-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold ">Payments</h1>
            <p className="text-gray-600 text-sm">Manage and monitor all payments</p>
          </div>
          <button
            onClick={exportPayments}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="text-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold ">
                  {formatCurrency(statistics.total_revenue, 'NGN')}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{statistics.total_payments} total payments</p>
          </div>

          <div className="text-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-xl font-bold ">
                  {statistics.success_rate}%
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{statistics.completed_payments} completed</p>
          </div>

          <div className="text-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-xl font-bold ">
                  {statistics.failed_payments}
                </p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{statistics.pending_payments} pending</p>
          </div>

          <div className="text-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Refunded</p>
                <p className="text-xl font-bold ">
                  {statistics.refunded_payments}
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Refund transactions</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 text-white border-b border-gray-200">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by username, reference..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 w-full px-3 py-2 border border-gray-300 rounded-lg hover:"
          >
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <ArrowUpDown className="w-4 h-4 text-gray-400 ml-auto" />
          </button>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 bg-gray-700 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Method Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={filters.method}
                  onChange={(e) => handleFilterChange('method', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Providers</option>
                  <option value="flutterwave">Flutterwave</option>
                  <option value="paystack">Paystack</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              {/* Sort */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={`${filters.sort_by}-${filters.sort_order}`}
                  onChange={(e) => {
                    const [sort_by, sort_order] = e.target.value.split('-');
                    handleFilterChange('sort_by', sort_by);
                    handleFilterChange('sort_order', sort_order);
                  }}
                  className="w-full px-3 py-2 border bg-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="amount-desc">Amount: High to Low</option>
                  <option value="amount-asc">Amount: Low to High</option>
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
              onClick={() => fetchPayments(filters)}
              className="mt-2 flex items-center space-x-1 text-red-800 text-sm font-medium hover:text-red-900"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="p-4">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium  mb-2">No payments found</h3>
            <p className="text-gray-500">No payments match your current filters.</p>
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  status: '',
                  method: '',
                  sort_by: 'created_at',
                  sort_order: 'desc'
                });
                fetchPayments();
              }}
              className="mt-4 text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {(payments as Payment[]).map((payment) => (
              <div
                key={payment.id}
                className="text-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getMethodIcon(payment.provider)}
                    <div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <p className="font-medium  text-sm">{payment.user.username}</p>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">Ref: {payment.provider_reference}</p>
                    </div>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>

                {/* Plan Info */}
                <div className="flex items-center justify-between mb-3 p-2  rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getPlanTierIcon(payment.plan.tier)}
                    <span className="text-sm font-medium ">{payment.plan.name}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlanTierColor(payment.plan.tier)}`}>
                    {payment.plan.tier}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <div>
                      <p className="text-gray-600 text-xs">Amount</p>
                      <p className="font-semibold ">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Package className="w-3 h-3 text-gray-400" />
                    <div>
                      <p className="text-gray-600 text-xs">Billing</p>
                      <p className="font-medium  capitalize">
                        {payment.billing_cycle}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <CreditCard className="w-3 h-3 text-gray-400" />
                    <div>
                      <p className="text-gray-600 text-xs">Provider</p>
                      <p className="font-medium  capitalize">
                        {payment.provider}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <div>
                      <p className="text-gray-600 text-xs">Paid At</p>
                      <p className="font-medium  text-xs">
                        {formatDate(payment.dates.paid_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment ID */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-mono truncate">ID: {payment.id}</p>
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
              <span>Previous</span>
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
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading for pagination */}
        {loading && payments.length > 0 && (
          <div className="mt-4 flex justify-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentsPage;