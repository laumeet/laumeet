'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, Search, Crown, User, DollarSign, Edit3, Save, X, Trash2, Download, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAdminUsers } from '@/hooks/use-admin-users';

interface UserData {
  id: string;
  username: string;
  name: string;
  age: string;
  gender: string;
  department: string;
  level: string;
  genotype: string;
  religious: string;
  interestedIn: string;
  isAnonymous: boolean;
  category: string;
  bio: string;
  pictures: string[];
  timestamp: string;
  is_admin: boolean;
  subscription?: {
    plan_name: string;
    tier: string;
    status: string;
    billing_cycle: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
    auto_renew: boolean;
  };
  usage?: {
    messages_used: number;
    messages_limit: number;
    likes_used: number;
    likes_limit: number;
    swipes_used: number;
    swipes_limit: number;
  };
  payment_summary?: {
    total_payments: number;
    successful_payments: number;
    total_revenue: number;
  };
}

interface Statistics {
  total_users: number;
  premium_users: number;
  free_users: number;
  premium_percentage: number;
  total_revenue: number;
  monthly_revenue: number;
  arpu: number;
}

export default function AdminUsersPage() {
  const { users, loading, error, totalUsers, statistics, pagination, refetch, deleteUser, updateUser, exportUsers } = useAdminUsers();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<UserData> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const stats: Statistics = statistics || {
    total_users: 0,
    premium_users: 0,
    free_users: 0,
    premium_percentage: 0,
    total_revenue: 0,
    monthly_revenue: 0,
    arpu: 0
  };

  useEffect(() => {
    refetch({
      page: currentPage,
      per_page: perPage,
      search: searchTerm,
      subscription: subscriptionFilter,
      sort_by: sortBy,
      sort_order: sortOrder
    });
  }, [searchTerm, subscriptionFilter, sortBy, sortOrder, currentPage, perPage, refetch]);

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(userId);
      const result = await deleteUser(userId);
      
      if (result.success) {
        toast.success(`User "${username}" deleted successfully`);
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(null);
        }
      } else {
        toast.error(result.message || 'Failed to delete user');
      }
    } catch (err) {
      toast.error('An error occurred while deleting the user');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportUsers = async () => {
    try {
      const result = await exportUsers({
        search: searchTerm,
        subscription: subscriptionFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (result.success) {
        toast.success('Users exported successfully');
      } else {
        toast.error(result.message || 'Failed to export users');
      }
    } catch (err) {
      toast.error('An error occurred while exporting users');
    }
  };

  const handleEditUser = (user: UserData) => {
    setIsEditing(user.id);
    setEditingUser({ ...user });
  };

  const handleSaveUser = async (userId: string) => {
    if (!editingUser) return;

    try {
      const result = await updateUser(userId, editingUser);
      
      if (result.success) {
        toast.success('User updated successfully');
        setIsEditing(null);
        setEditingUser(null);
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(result.user || selectedUser);
        }
      } else {
        toast.error(result.message || 'Failed to update user');
      }
    } catch (err) {
      toast.error('An error occurred while updating the user');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditingUser(null);
  };

  const getSubscriptionBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium': return 'default';
      case 'vip': return 'secondary';
      default: return 'outline';
    }
  };

  const getSubscriptionIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return <Crown className="h-3 w-3" />;
      case 'vip': return <DollarSign className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const formatLimit = (used: number, limit: number) => {
    return limit === -1 ? `${used} / ∞` : `${used} / ${limit}`;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePageNumbers = () => {
    if (!pagination) return [];
    
    const totalPages = pagination.total_pages;
    const current = currentPage;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    let prev = 0;
    for (const i of range) {
      if (i - prev > 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
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
            Error loading users: {error}
            <div className="mt-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage registered users and subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportUsers} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total_users.toLocaleString()}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Premium Users</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.premium_users.toLocaleString()}</p>
                <p className="text-xs text-green-600 font-medium">{stats.premium_percentage}% conversion</p>
              </div>
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">₦{stats.total_revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">₦{stats.monthly_revenue.toLocaleString()}</p>
                <p className="text-xs text-gray-600">ARPU: ₦{stats.arpu}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Users List */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Users List
              </CardTitle>
              <CardDescription>Click on a user to view details</CardDescription>
              
              {/* Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="subscription-filter" className="text-xs">Subscription</Label>
                    <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                      <SelectTrigger id="subscription-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="free">Free Only</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sort-by" className="text-xs">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-by">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Newest</SelectItem>
                        <SelectItem value="username">Username</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={sortOrder === 'desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('desc')}
                    className="flex-1"
                  >
                    Desc
                  </Button>
                  <Button
                    variant={sortOrder === 'asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortOrder('asc')}
                    className="flex-1"
                  >
                    Asc
                  </Button>
                </div>

                {/* Items per page selector */}
                <div className="space-y-2">
                  <Label htmlFor="per-page" className="text-xs">Items per page</Label>
                  <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number(value))}>
                    <SelectTrigger id="per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedUser?.id === user.id 
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700 shadow-sm' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <h3 className="font-medium truncate text-sm">{user.name || user.username}</h3>
                          {user.is_admin && (
                            <Badge variant="default" className="bg-purple-500 text-white text-xs px-1.5 py-0 h-4">
                              Admin
                            </Badge>
                          )}
                        </div>
                        {/* <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {user.department} • {user.level}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">@{user.username}</p>
                          {user.subscription && user.subscription.tier !== 'free' && (
                            <Badge variant={getSubscriptionBadgeVariant(user.subscription.tier)} className="flex items-center gap-1 text-xs px-1.5 py-0 h-4">
                              {getSubscriptionIcon(user.subscription.tier)}
                              {user.subscription.tier}
                            </Badge>
                          )}
                        </div> */}
                      </div>
                      <Badge variant={user.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                        {user.gender}
                      </Badge>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(user.timestamp).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        {/* <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditUser(user);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button> */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={isDeleting === user.id}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id, user.username);
                          }}
                        >
                          {isDeleting === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No users found</p>
                    <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
                  </div>
                )}
              </div>

              {/* Enhanced Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, pagination.)} of {pagination.total_records} users
                    </div> */}
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={!pagination.has_prev || currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronLeft className="h-4 w-4 -ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.has_prev}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex gap-1">
                        {generatePageNumbers().map((page, index) => (
                          page === '...' ? (
                            <span key={`dots-${index}`} className="px-2 py-1 text-gray-500">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          )
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.has_next}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.total_pages)}
                        disabled={!pagination.has_next || currentPage === pagination.total_pages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4 -ml-1" />
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {pagination.total_pages}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* User Details */}
        <div className="xl:col-span-3">
          {selectedUser ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                   
                      <div>
                        <CardTitle>{selectedUser.name || selectedUser.username}</CardTitle>
                        <CardDescription>
                          {selectedUser.department} • {selectedUser.level} • {selectedUser.age} years old
                        </CardDescription>
                      </div>
                    
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedUser.gender === 'male' ? 'default' : 'secondary'}>
                      {selectedUser.gender}
                    </Badge>
                    <Badge variant={selectedUser.isAnonymous ? 'destructive' : 'outline'}>
                      {selectedUser.isAnonymous ? 'Anonymous' : 'Public'}
                    </Badge>
                    {selectedUser.is_admin && (
                      <Badge variant="default" className="bg-purple-500">
                        Admin
                      </Badge>
                    )}
                    {selectedUser.subscription && selectedUser.subscription.tier !== 'free' && (
                      <Badge variant={getSubscriptionBadgeVariant(selectedUser.subscription.tier)} className="flex items-center gap-1">
                        {getSubscriptionIcon(selectedUser.subscription.tier)}
                        {selectedUser.subscription.tier}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Details */}
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div>
                      <div className=" justify-between mb-3">
                        <h3 className="font-semibold">Change Admin Status</h3>
                        {isEditing === selectedUser.id ? (
                          <div className="flex gap-2">
                               <div className="flex items-center mr-7 space-x-2">
                                <Switch
                                  id="admin"
                                  checked={editingUser?.is_admin || false}
                                  onCheckedChange={(checked) => setEditingUser(prev => ({ ...prev, is_admin: checked }))}
                                />
                                <Label htmlFor="admin" className="text-xs">Admin User</Label>
                              </div>
                            <Button size="sm" onClick={() => handleSaveUser(selectedUser.id)} className="flex items-center gap-1">
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="flex items-center gap-1">
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => handleEditUser(selectedUser)} className="flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3 text-sm">
                        {isEditing === selectedUser.id ? (
                          <div className="space-y-4">
                            {/* <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="username" className="text-xs">Username</Label>
                                <Input
                                  id="username"
                                  value={editingUser?.username || ''}
                                  onChange={(e) => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="age" className="text-xs">Age</Label>
                                <Input
                                  id="age"
                                  value={editingUser?.age || ''}
                                  onChange={(e) => setEditingUser(prev => ({ ...prev, age: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="gender" className="text-xs">Gender</Label>
                                <Select 
                                  value={editingUser?.gender || ''} 
                                  onValueChange={(value) => setEditingUser(prev => ({ ...prev, gender: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="category" className="text-xs">Category</Label>
                                <Input
                                  id="category"
                                  value={editingUser?.category || ''}
                                  onChange={(e) => setEditingUser(prev => ({ ...prev, category: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bio" className="text-xs">Bio</Label>
                              <Textarea
                                id="bio"
                                value={editingUser?.bio || ''}
                                onChange={(e) => setEditingUser(prev => ({ ...prev, bio: e.target.value }))}
                                rows={3}
                              />
                            </div> */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* <div className="flex items-center space-x-2">
                                <Switch
                                  id="anonymous"
                                  checked={editingUser?.isAnonymous || false}
                                  onCheckedChange={(checked) => setEditingUser(prev => ({ ...prev, isAnonymous: checked }))}
                                />
                                <Label htmlFor="anonymous" className="text-xs">Anonymous Profile</Label>
                              </div> */}
                              {/* <div className="flex items-center space-x-2">
                                <Switch
                                  id="admin"
                                  checked={editingUser?.is_admin || false}
                                  onCheckedChange={(checked) => setEditingUser(prev => ({ ...prev, is_admin: checked }))}
                                />
                                <Label htmlFor="admin" className="text-xs">Admin User</Label>
                              </div> */}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Username:</span>
                              <span className="font-medium">@{selectedUser.username}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Category:</span>
                              <span className="font-medium capitalize">{selectedUser.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium">{selectedUser.age}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Department:</span>
                              <span className="font-medium">{selectedUser.department || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Level:</span>
                              <span className="font-medium">{selectedUser.level || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Genotype:</span>
                              <span className="font-medium">{selectedUser.genotype || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Religion:</span>
                              <span className="font-medium">{selectedUser.religious || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Interested In:</span>
                              <span className="font-medium text-right capitalize">
                                {selectedUser.interestedIn || 'Not set'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Admin Status:</span>
                              <span className={`font-medium ${selectedUser.is_admin ? 'text-green-600' : 'text-gray-600'}`}>
                                {selectedUser.is_admin ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Registered:</span>
                              <span className="font-medium">
                                {new Date(selectedUser.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Subscription Details */}
                    {selectedUser.subscription && (
                      <div>
                        <h3 className="font-semibold mb-3">Subscription Details</h3>
                        <div className="space-y-2 text-sm bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Plan:</span>
                            <span className="font-medium capitalize">{selectedUser.subscription.plan_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge variant={selectedUser.subscription.status === 'active' ? 'default' : 'secondary'}>
                              {selectedUser.subscription.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Billing Cycle:</span>
                            <span className="font-medium capitalize">{selectedUser.subscription.billing_cycle}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Auto-renew:</span>
                            <span className={`font-medium ${selectedUser.subscription.auto_renew ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedUser.subscription.auto_renew ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Days Remaining:</span>
                            <span className="font-medium">{selectedUser.subscription.days_remaining}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expires:</span>
                            <span className="font-medium">
                              {new Date(selectedUser.subscription.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Usage Statistics */}
                    {selectedUser.usage && (
                      <div>
                        <h3 className="font-semibold mb-3">Usage Statistics</h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Messages:</span>
                              <span className="font-medium">
                                {formatLimit(selectedUser.usage.messages_used, selectedUser.usage.messages_limit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${getUsagePercentage(selectedUser.usage.messages_used, selectedUser.usage.messages_limit)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Likes:</span>
                              <span className="font-medium">
                                {formatLimit(selectedUser.usage.likes_used, selectedUser.usage.likes_limit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${getUsagePercentage(selectedUser.usage.likes_used, selectedUser.usage.likes_limit)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Swipes:</span>
                              <span className="font-medium">
                                {formatLimit(selectedUser.usage.swipes_used, selectedUser.usage.swipes_limit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${getUsagePercentage(selectedUser.usage.swipes_used, selectedUser.usage.swipes_limit)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Payment Summary */}
                    {selectedUser.payment_summary && (
                      <div>
                        <h3 className="font-semibold mb-3">Payment Summary</h3>
                        <div className="space-y-2 text-sm bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Payments:</span>
                            <span className="font-medium">{selectedUser.payment_summary.total_payments}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Successful Payments:</span>
                            <span className="font-medium text-green-600">{selectedUser.payment_summary.successful_payments}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Revenue:</span>
                            <span className="font-medium text-green-600">₦{selectedUser.payment_summary.total_revenue.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bio Section */}
                    {selectedUser.bio && (
                      <div>
                        <h3 className="font-semibold mb-2">Bio</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          {selectedUser.bio}
                        </p>
                      </div>
                    )}

                    {/* User Images */}
                    <div>
                      <h3 className="font-semibold mb-3">
                        Profile Pictures ({selectedUser.pictures?.length || 0})
                        {selectedUser.isAnonymous && selectedUser.category && 
                         ['Hook Up', 'Sex Chat', 'Fuck Mate'].includes(selectedUser.category) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Faces Blurred
                          </Badge>
                        )}
                      </h3>
                      {selectedUser.pictures && selectedUser.pictures.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {selectedUser.pictures.map((image, index) => (
                            <div key={index} className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img 
                                src={image} 
                                alt={`${selectedUser.name || selectedUser.username} ${index + 1}`}
                                className="w-full h-32 object-cover hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No profile pictures uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>Select a user from the list to view their complete information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-16">
                  <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No user selected</p>
                  <p className="text-sm mt-1">Choose a user from the list to see their details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}