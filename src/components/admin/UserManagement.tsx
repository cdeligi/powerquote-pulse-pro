import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types/auth';

interface UserManagementProps {
  user?: User;
}

export default function UserManagement({ user }: UserManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p>User management functionality will be available soon.</p>
        {user && <p>Managing user: {user.email}</p>}
      </CardContent>
    </Card>
  );
}