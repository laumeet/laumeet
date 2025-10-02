'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAdminUsers } from '@/hooks/use-admin-users';

interface UserData {
  id: string;
  public_id: string;
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
}

export default function AdminUsersPage() {
  const { users, loading, error, totalUsers, refetch, deleteUser } = useAdminUsers();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(userId);
      const result = await deleteUser(userId);
      
      if (result.success) {
        toast.success(`User "${username}" deleted successfully`);
        if (selectedUser && selectedUser.public_id === userId) {
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

  const clearAllData = () => {
    if (confirm('Are you sure you want to delete ALL user data? This action cannot be undone.')) {
      // Note: You'll need to implement a bulk delete endpoint in your Flask backend
      toast.info('Bulk delete functionality coming soon');
    }
  };

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading users: {error}
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage registered users ({totalUsers} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline">
            Refresh
          </Button>
          <Button onClick={clearAllData} variant="destructive">
            Clear All Data
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Users List</CardTitle>
              <CardDescription>Click on a user to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {users.map((user) => (
                  <div 
                    key={user.public_id} 
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedUser?.public_id === user.public_id 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                        : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{user.name || user.username}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {user.department} - {user.level}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">@{user.username}</p>
                      </div>
                      <Badge variant={user.gender === 'male' ? 'default' : 'secondary'}>
                        {user.gender}
                      </Badge>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {new Date(user.timestamp).toLocaleDateString()}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={isDeleting === user.public_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(user.public_id, user.username);
                        }}
                      >
                        {isDeleting === user.public_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No users registered yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* User Details */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedUser.name || selectedUser.username}</CardTitle>
                    <CardDescription>
                      {selectedUser.department} • {selectedUser.level} • {selectedUser.age} years old
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Personal Information</h3>
                      <div className="space-y-2 text-sm">
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
                          <span className="text-gray-600">Registered:</span>
                          <span className="font-medium">
                            {new Date(selectedUser.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bio Section */}
                    {selectedUser.bio && (
                      <div>
                        <h3 className="font-semibold mb-2">Bio</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          {selectedUser.bio}
                        </p>
                      </div>
                    )}
                  </div>
                  
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
                  <p>No user selected</p>
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