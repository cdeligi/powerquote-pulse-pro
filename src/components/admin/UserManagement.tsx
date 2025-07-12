import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Shield, Eye } from 'lucide-react';
import { User } from '@/types/auth';

interface UserManagementProps {
  user?: User;
}

export default function UserManagement({ user }: UserManagementProps) {
  // Mock users data
  const users = [
    {
      id: '1',
      name: 'Carlos Deligi',
      email: 'cdeligi@qualitrolcorp.com',
      role: 'admin',
      department: 'Management',
      status: 'active',
      createdAt: '2024-01-01'
    },
    {
      id: '2',
      name: 'John Smith',
      email: 'jsmith@qualitrolcorp.com',
      role: 'level2',
      department: 'Sales',
      status: 'active',
      createdAt: '2024-01-05'
    },
    {
      id: '3',
      name: 'Jane Doe',
      email: 'jdoe@qualitrolcorp.com',
      role: 'level1',
      department: 'Sales',
      status: 'active',
      createdAt: '2024-01-10'
    }
  ];

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: 'bg-red-600', text: 'Administrator' },
      level2: { color: 'bg-green-600', text: 'Level 2 Sales' },
      level1: { color: 'bg-blue-600', text: 'Level 1 Sales' },
      finance: { color: 'bg-purple-600', text: 'Finance' }
    };
    return roleConfig[role as keyof typeof roleConfig] || roleConfig.level1;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-600', text: 'Active' },
      inactive: { color: 'bg-gray-600', text: 'Inactive' },
      pending: { color: 'bg-yellow-600', text: 'Pending' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
          <Badge variant="secondary" className="ml-auto">
            {users.length} users
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-400">Manage system users and permissions</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          <div className="space-y-4">
            {users.map((userData) => {
              const roleBadge = getRoleBadge(userData.role);
              const statusBadge = getStatusBadge(userData.status);
              
              return (
                <div
                  key={userData.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                        {userData.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{userData.name}</h3>
                        <p className="text-gray-400 text-sm">{userData.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`${roleBadge.color} text-white`}>
                        {roleBadge.text}
                      </Badge>
                      <Badge className={`${statusBadge.color} text-white`}>
                        {statusBadge.text}
                      </Badge>
                      {userData.department && (
                        <Badge variant="outline" className="text-gray-300 border-gray-600">
                          {userData.department}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-500 text-xs mt-2">
                      Created: {userData.createdAt}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}