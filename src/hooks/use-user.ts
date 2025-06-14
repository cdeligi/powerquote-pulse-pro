
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'level1' | 'level2' | 'admin';
  department?: string;
}

// Mock user data - in a real app this would come from authentication
const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'level1',
  department: 'Engineering'
};

export const useUser = () => {
  const [user, setUser] = useState<User>(mockUser);
  const [isLoading, setIsLoading] = useState(false);

  return {
    user,
    isLoading,
    setUser
  };
};
