'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, Crown, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user: { id: string; username: string; name: string };
  plan: { name: string; tier: string; monthly_price: number; yearly_price: number };
  status: string;
  billing_cycle: string;
  dates: { start_date: string; end_date: string; canceled_at: string | null };
  auto_renew: boolean;
  usage: {
    messages: { used: number; limit: number; remaining: number };
    likes: { used: number; limit: number; remaining: number };
    swipes: { used: number; limit: number; remaining: number };
  };
  days_remaining: number;
  created_at: string;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  expired_subscriptions: number;
  revenue_by_tier: { [key: string]: number };
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    status: 'all',
    tier: 'all'
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('page', filters.page.toString());
      queryParams.append('per_page', filters.per_page.toString());
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.tier !== 'all') queryParams.append('tier', filters.tier);

      const response = await fetch(`/api/admin/subscriptions?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.subscriptions || []);
        setStats(data.statistics || null);
      } else {
        throw new Error(data.message || 'Failed to fetch subscriptions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [filters]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'canceled': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium': return 'default';
      case 'vip': return 'secondary';
      default: return 'outline';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return <Crown className="h-3 w-3" />;
      case 'vip': return <DollarSign className="h-3 w-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading subscriptions...</p>
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
            {error}
            <div className="mt-3">
              <Button onClick={fetchSubscriptions} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Subscription Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Manage user subscriptions and monitor revenue
          </p>
        </div>
        <Button onClick={fetchSubscriptions} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Subscriptions</p>
              <p className="text-2xl font-bold">{stats.total_subscriptions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active_subscriptions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Canceled</p>
              <p className="text-2xl font-bold text-red-500">{stats.canceled_subscriptions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                ₦{Object.values(stats.revenue_by_tier).reduce((a, b) => a + b, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
          <SelectTrigger className="sm:w-[180px] w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.tier} onValueChange={(value) => setFilters(prev => ({ ...prev, tier: value }))}>
          <SelectTrigger className="sm:w-[180px] w-full">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead className="hidden md:table-cell">Usage</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead className="hidden sm:table-cell">Auto-renew</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div>
                    <p className="font-medium truncate max-w-[120px]">{subscription.user.name || subscription.user.username}</p>
                    <p className="text-xs text-gray-500">@{subscription.user.username}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getTierBadgeVariant(subscription.plan.tier)} className="flex items-center gap-1">
                    {getTierIcon(subscription.plan.tier)}
                    {subscription.plan.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="capitalize text-sm">{subscription.billing_cycle}</p>
                  <p className="text-xs text-gray-500">
                    ₦{subscription.billing_cycle === 'yearly'
                      ? subscription.plan.yearly_price.toLocaleString()
                      : subscription.plan.monthly_price.toLocaleString()}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  <div className="space-y-1">
                    <p>Msg: {subscription.usage.messages.used}/{subscription.usage.messages.limit}</p>
                    <p>Likes: {subscription.usage.likes.used}/{subscription.usage.likes.limit}</p>
                    <p>Swipes: {subscription.usage.swipes.used}/{subscription.usage.swipes.limit}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={subscription.days_remaining < 7 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    {subscription.days_remaining}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={subscription.auto_renew ? 'default' : 'outline'}>
                    {subscription.auto_renew ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(subscription.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {subscriptions.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No subscriptions found.
        </div>
      )}
    </div>
  );
}
