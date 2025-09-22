'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserData {
  id: string;
  gender: string;
  isAnonymous?: boolean;
  category: string;
  age: string;
  name: string;
  department: string;
  level: string;
  genotype: string;
  religious: string;
  interestedIn?: string;
  images: string[];
  timestamp: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('campusConnectUsers') || '[]');
    setUsers(storedUsers);
  }, []);

  const clearData = () => {
    if (confirm('Are you sure you want to delete all user data?')) {
      localStorage.removeItem('campusConnectUsers');
      setUsers([]);
      setSelectedUser(null);
    }
  };

  const deleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(user => user.id !== userId);
      localStorage.setItem('campusConnectUsers', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(null);
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Registered Users</h1>
        <Button onClick={clearData} variant="destructive">
          Clear All Data
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Users ({users.length})</CardTitle>
              <CardDescription>Click on a user to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.department} - {user.level}</p>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUser(user.id);
                        }}
                      >
                        Delete
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
                    <CardTitle>{selectedUser.name}</CardTitle>
                    <CardDescription>
                      {selectedUser.department} • {selectedUser.level} • {selectedUser.age} years old
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={selectedUser.gender === 'male' ? 'default' : 'secondary'}>
                      {selectedUser.gender}
                    </Badge>
                    {selectedUser.isAnonymous !== undefined && (
                      <Badge variant={selectedUser.isAnonymous ? 'destructive' : 'outline'}>
                        {selectedUser.isAnonymous ? 'Anonymous' : 'Not Anonymous'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Details */}
                  <div>
                    <h3 className="font-semibold mb-3">Personal Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{selectedUser.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Age:</span>
                        <span className="font-medium">{selectedUser.age}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-medium">{selectedUser.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Level:</span>
                        <span className="font-medium">{selectedUser.level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Genotype:</span>
                        <span className="font-medium">{selectedUser.genotype}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Religion:</span>
                        <span className="font-medium">{selectedUser.religious}</span>
                      </div>
                      {selectedUser.interestedIn && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Interested In:</span>
                          <span className="font-medium text-right">{selectedUser.interestedIn}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registered:</span>
                        <span className="font-medium">
                          {new Date(selectedUser.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* User Images */}
                  <div>
                    <h3 className="font-semibold mb-3">
                      Images ({selectedUser.images?.length || 0})
                      {selectedUser.isAnonymous && selectedUser.category && 
                       ['Hook Up', 'Sex Chat', 'Fuck Mate'].includes(selectedUser.category) && (
                        <Badge variant="outline" className="ml-2">
                          Faces Blurred
                        </Badge>
                      )}
                    </h3>
                    {selectedUser.images && selectedUser.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedUser.images.map((image, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <img 
                              src={image} 
                              alt={`${selectedUser.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No images uploaded</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>Select a user from the list to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-10">
                  <p>No user selected</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}