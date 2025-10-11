'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Users, Crown, DollarSign, TrendingUp, Calendar, Zap, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';

interface PlanDistribution {
  plan: string;
  count: number;
}

export default function AdminDashboardPage() {
  const { dashboardData, loading, error, refetch, refreshDashboard } = useAdminDashboard();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = async () => {
    try {
      await refreshDashboard();
      setLastUpdated(new Date());
      toast.success('Dashboard updated successfully');
    } catch (err) {
      toast.error('Failed to refresh dashboard');
    }
  };

  useEffect(() => {
    if (dashboardData && !lastUpdated) {
      setLastUpdated(new Date());
    }
  }, [dashboardData, lastUpdated]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error}
            <div className="mt-2">
              <Button onClick={refetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No dashboard data available
            <div className="mt-2">
              <Button onClick={refetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { user_stats, subscription_stats, revenue_stats, recent_activity } = dashboardData;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="items-center mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of platform performance and metrics
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(user_stats.total_users)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {user_stats.new_users_today} new today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Users</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(user_stats.online_users)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(user_stats.premium_users)}</div>
            <p className="text-xs text-green-600">
              {user_stats.premium_percentage}% conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(subscription_stats.active_subscriptions)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {subscription_stats.conversion_rate}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue_stats.total_revenue)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              All-time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue_stats.today_revenue)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Revenue generated today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue_stats.monthly_recurring_revenue)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Recurring monthly revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              Active subscriptions by plan type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscription_stats.plan_distribution.map((plan: PlanDistribution, index) => (
                <div key={plan.plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: [
                          '#3b82f6', // blue
                          '#f59e0b', // yellow
                          '#10b981', // green
                          '#8b5cf6', // purple
                          '#ef4444', // red
                        ][index % 5]
                      }}
                    />
                    <span className="font-medium capitalize">{plan.plan}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{formatNumber(plan.count)}</Badge>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {subscription_stats.active_subscriptions > 0 
                        ? `${Math.round((plan.count / subscription_stats.active_subscriptions) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              ))}
              {subscription_stats.plan_distribution.length === 0 && (
                <p className="text-gray-500 text-center py-4">No active subscriptions</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">User Growth Rate</span>
                <Badge variant={
                  user_stats.new_users_today > 10 ? "default" : 
                  user_stats.new_users_today > 5 ? "secondary" : "outline"
                }>
                  +{user_stats.new_users_today} today
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Premium Conversion</span>
                <Badge variant={
                  user_stats.premium_percentage > 20 ? "default" : 
                  user_stats.premium_percentage > 10 ? "secondary" : "outline"
                }>
                  {user_stats.premium_percentage}%
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subscription Health</span>
                <Badge variant={
                  subscription_stats.conversion_rate > 15 ? "default" : 
                  subscription_stats.conversion_rate > 8 ? "secondary" : "outline"
                }>
                  {subscription_stats.conversion_rate}%
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Revenue Trend</span>
                <Badge variant={
                  revenue_stats.today_revenue > 10000 ? "default" : 
                  revenue_stats.today_revenue > 5000 ? "secondary" : "outline"
                }>
                  {revenue_stats.today_revenue > 0 ? 'Positive' : 'No revenue today'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>
              Latest successful transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_activity.recent_payments.slice(0, 5).map((payment, index) => (
                <div key={payment.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {payment.user?.name || payment.user?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {payment.plan?.name || 'Unknown Plan'}
                    </Badge>
                  </div>
                </div>
              ))}
              {recent_activity.recent_payments.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent payments</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscriptions</CardTitle>
            <CardDescription>
              New active subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_activity.recent_subscriptions.slice(0, 5).map((subscription, index) => (
                <div key={subscription.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Crown className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {subscription.user?.name || subscription.user?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(subscription.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      subscription.plan?.tier === 'premium' ? 'default' : 
                      subscription.plan?.tier === 'vip' ? 'secondary' : 'outline'
                    }>
                      {subscription.plan?.name || 'Unknown'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {subscription.billing_cycle}
                    </p>
                  </div>
                </div>
              ))}
              {recent_activity.recent_subscriptions.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent subscriptions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}