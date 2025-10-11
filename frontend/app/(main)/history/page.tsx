/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/history/page.tsx
'use client'
import React from 'react';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import type { Payment as PaymentHistoryPayment } from '@/hooks/usePaymentHistory';

const PaymentHistoryPage = () => {
  const { payments, loading, error, pagination, fetchPaymentHistory } = usePaymentHistory();

  const handlePageChange = (newPage: number) => {
    fetchPaymentHistory(newPage, pagination.limit);
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; text: string } } = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' },
      refunded: { color: 'bg-blue-100 text-blue-800', text: 'Refunded' },
      partially_refunded: { color: 'bg-purple-100 text-purple-800', text: 'Partially Refunded' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getProviderIcon = (provider: string) => {
    const providerIcons: { [key: string]: string } = {
      flutterwave: '🟠',
      paystack: '🟢',
      stripe: '🔵'
    };
    
    return providerIcons[provider] || '💳';
  };

  if (loading && payments.length === 0) {
    return (
      <div className="min-h-screen  py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payment history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className=" border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchPaymentHistory()}
                  className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold ">Payment History</h1>
          <p className="mt-2 text-gray-600">
            View your subscription payments and billing history
          </p>
        </div>

        {/* Payment List */}
        {payments.length === 0 ? (
          <div className="rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <h3 className="mt-4 text-lg font-medium ">No payments found</h3>
            <p className="mt-2 text-gray-500">You haven&apos;t made any payments yet.</p>
          </div>
        ) : (
          <div className="shadow-sm rounded-lg overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment: PaymentHistoryPayment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{getProviderIcon(payment.provider)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {(payment as any).provider_reference || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {payment.plan?.name || 'Unknown Plan'}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {payment.billing_cycle}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.dates.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              <div className="divide-y divide-gray-200">
                {payments.map((payment: PaymentHistoryPayment) => (
                  <div key={payment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{getProviderIcon(payment.provider)}</span>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {payment.plan?.name || 'Unknown Plan'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Billing</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {payment.billing_cycle}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-500">
                      {formatDate(payment.dates.created_at)}
                    </div>
                    
                    {(payment as any).provider_reference && (
                      <div className="mt-2 text-xs text-gray-400">
                        Ref: {(payment as any).provider_reference}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((pagination.page - 1) * pagination.limit) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.has_prev}
                        className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          pagination.has_prev
                            ? 'text-gray-500 hover:bg-gray-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.has_next}
                        className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          pagination.has_next
                            ? 'text-gray-500 hover:bg-gray-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator for pagination */}
        {loading && payments.length > 0 && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;