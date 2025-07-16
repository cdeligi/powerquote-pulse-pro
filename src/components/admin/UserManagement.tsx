import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  UserCheck,
  UserX,
  Clock,
  UserPlus,
  RefreshCw,
  Edit,
  Trash2
} from "lucide-react";
import { supabase, supabaseAdmin, isAdminAvailable } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import UserEditDialog from "./UserEditDialog";
import UserRequestsTab from "./UserRequestsTab";
import AuditLogTab from "./AuditLogTab";

interface MergedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string | null;
  userStatus: string;
  jobTitle?: string | null;
  phoneNumber?: string | null;
  managerEmail?: string | null;
  companyName?: string | null;
  businessJustification?: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
}

interface UserManagementProps {
  user: User;
}

const UserManagement = ({ user }: UserManagementProps) => {
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<MergedUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [adminClientReady, setAdminClientReady] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  const [adminClientError, setAdminClientError] = useState<string | null>(null);
  
  // Create user form state
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'level1',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    managerEmail: '',
    companyName: '',
    businessJustification: '',
    password: '',
    showPassword: false
  });

  const handleCreateUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = () => {
    setCreateUserForm(prev => ({
      ...prev,
      showPassword: !prev.showPassword
    }));
  };

  // Password validation
  const validatePassword = (password: string) => {
    // At least 8 characters
    const lengthRegex = /^.{8,}$/;
    // At least one uppercase letter
    const uppercaseRegex = /[A-Z]/;
    // At least one lowercase letter
    const lowercaseRegex = /[a-z]/;
    // At least one number
    const numberRegex = /[0-9]/;

    // Check each requirement
    const requirements = [
      { regex: lengthRegex, message: 'Password must be at least 8 characters long' },
      { regex: uppercaseRegex, message: 'Password must contain at least one uppercase letter' },
      { regex: lowercaseRegex, message: 'Password must contain at least one lowercase letter' },
      { regex: numberRegex, message: 'Password must contain at least one number' }
    ];

    // Check each requirement and collect error messages
    const errorMessages = requirements
      .filter(req => !req.regex.test(password))
      .map(req => req.message);

    // If there are any errors, show them
    if (errorMessages.length > 0) {
      toast({
        title: "Validation Error",
        description: errorMessages.join('. ') + '.',
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Department options
  const DEPARTMENT_OPTIONS = [
    { value: 'quotation-team', label: 'Quotation Team' },
    { value: 'sales', label: 'Sales' },
    { value: 'application-eng', label: 'Application Eng.' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'channel-partner', label: 'Channel Partner' },
    { value: 'field-service', label: 'Field Service' },
    { value: 'tas', label: 'TAS' }
  ];

  // Initialize admin client
  useEffect(() => {
    const initialize = async () => {
      try {
        await supabaseAdmin.auth.getSession();
        setAdminClientReady(true);
        setAdminClientError(null);
        if (!initialLoadAttempted) {
          setInitialLoadAttempted(true);
          await loadUsers();
        }
      } catch (error: any) {
        console.error('Failed to initialize admin client:', error);
        setAdminClientError(error.message || 'Failed to initialize admin client');
        setAdminClientReady(false);
      }
    };

    initialize();
  }, []);

  // Load real users directly from database
  const loadUsers = async () => {
    console.log('Attempting to load users');
    
    try {
      setLoadingUsers(true);
      
      if (!isAdminAvailable()) {
        console.log('Admin client not available');
        throw new Error('Admin client not initialized. Please refresh the page.');
      }

      console.log('Fetching users from profiles table...');
      
      // Fetch directly from profiles table with all fields
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*');

      console.log('Profiles query result:', {
        data: profilesData,
        error: profilesError
      });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles data:', profilesData);
      
      // Transform profiles data to match expected format
      const transformedUsers = profilesData?.map(profile => ({
        id: profile.id,
        email: profile.email,
        fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        role: profile.role,
        department: profile.department,
        userStatus: profile.user_status || 'active',
        jobTitle: profile.job_title,
        phoneNumber: profile.phone_number,
        managerEmail: profile.manager_email,
        companyName: profile.company_name,
        businessJustification: profile.business_justification,
        confirmedAt: profile.confirmed_at,
        lastSignInAt: profile.last_sign_in_at,
        createdAt: profile.created_at
      })) || [];

      console.log('Transformed users:', transformedUsers);
      setUsers(transformedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Force reload users
  const handleReloadUsers = async () => {
    console.log('Forcing reload of users');
    setInitialLoadAttempted(false);
    await loadUsers();
  };

  // Create new user via admin edge function
  const handleCreateUser = async () => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not initialized. Please refresh the page.');
      }

      // Validate form
      if (!createUserForm.email || !createUserForm.firstName || !createUserForm.lastName || !createUserForm.department) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createUserForm.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }

      // Validate password
      if (createUserForm.password) {
        if (!validatePassword(createUserForm.password)) {
          return;
        }
      }

      // First check if user already exists
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', createUserForm.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create user in Supabase auth first using regular client
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createUserForm.email,
        password: createUserForm.password || Math.random().toString(36).substr(2, 10),
        options: {
          data: {
            first_name: createUserForm.firstName,
            last_name: createUserForm.lastName,
            role: createUserForm.role,
            department: createUserForm.department,
            job_title: createUserForm.jobTitle,
            phone_number: createUserForm.phoneNumber,
            manager_email: createUserForm.managerEmail,
            company_name: createUserForm.companyName,
            business_justification: createUserForm.businessJustification
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // Now create or update the profile record using admin client
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: createUserForm.email,
          first_name: createUserForm.firstName,
          last_name: createUserForm.lastName,
          role: createUserForm.role,
          department: createUserForm.department,
          job_title: createUserForm.jobTitle,
          phone_number: createUserForm.phoneNumber,
          manager_email: createUserForm.managerEmail,
          company_name: createUserForm.companyName,
          business_justification: createUserForm.businessJustification
        });

      if (profileError) {
        // If profile creation fails, delete the auth user
        await supabase.auth.deleteUser(authData.user.id);
        throw profileError;
      }

      toast({
        title: 'Success',
        description: 'User created successfully!'
      });

      // Reset form and close dialog
      setCreateUserForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'level1',
        department: '',
        jobTitle: '',
        phoneNumber: '',
        managerEmail: '',
        companyName: '',
        businessJustification: '',
        password: '',
        showPassword: false
      });
      
      // Refresh users list
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update user via admin edge function
  const handleUpdateUser = async (userData: any) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Supabase client not initialized');
      }

      // Get session from regular client
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/users`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          userStatus: userData.userStatus,
          department: userData.department,
          jobTitle: userData.jobTitle,
          phoneNumber: userData.phoneNumber,
          managerEmail: userData.managerEmail,
          companyName: userData.companyName,
          businessJustification: userData.businessJustification,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      // Refresh users list
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-600',
      finance: 'bg-purple-600',
      level2: 'bg-blue-600',
      level1: 'bg-green-600'
    };
    return (
      <Badge className={`${colors[role as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {role.toUpperCase()}
      </Badge>
    );
  };

  const getUserStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-600',
      inactive: 'bg-red-600',
      suspended: 'bg-yellow-600'
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-600'} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Render loading state
  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
          {adminClientError && (
            <p className="text-red-600 mt-2">{adminClientError}</p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReloadUsers}
            className="mt-4"
          >
            Reload
          </Button>
        </div>
      </div>
    );
  }

  // Render error state if admin client failed to initialize
  if (adminClientError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">{adminClientError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const renderCreateUserForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
            First Name *
          </Label>
          <Input
            id="firstName"
            name="firstName"
            value={createUserForm.firstName}
            onChange={handleCreateUserFormChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
            Last Name *
          </Label>
          <Input
            id="lastName"
            name="lastName"
            value={createUserForm.lastName}
            onChange={handleCreateUserFormChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={createUserForm.email}
            onChange={handleCreateUserFormChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="relative">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password *
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={createUserForm.showPassword ? 'text' : 'password'}
              value={createUserForm.password}
              onChange={handleCreateUserFormChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {createUserForm.showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.49a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="department" className="text-sm font-medium text-gray-700">
            Department *
          </Label>
          <Select
            id="department"
            name="department"
            value={createUserForm.department}
            onValueChange={(value) => handleCreateUserFormChange({ target: { name: 'department', value } })}
            required
          >
            <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="role" className="text-sm font-medium text-gray-700">
            Role *
          </Label>
          <Select
            id="role"
            name="role"
            value={createUserForm.role}
            onValueChange={(value) => handleCreateUserFormChange({ target: { name: 'role', value } })}
            required
          >
            <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="level1">Level 1</SelectItem>
              <SelectItem value="level2">Level 2</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">
            Job Title
          </Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            value={createUserForm.jobTitle}
            onChange={handleCreateUserFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            value={createUserForm.phoneNumber}
            onChange={handleCreateUserFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
            Company Name
          </Label>
          <Input
            id="companyName"
            name="companyName"
            value={createUserForm.companyName}
            onChange={handleCreateUserFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <Label htmlFor="managerEmail" className="text-sm font-medium text-gray-700">
            Manager Email
          </Label>
          <Input
            id="managerEmail"
            name="managerEmail"
            type="email"
            value={createUserForm.managerEmail}
            onChange={handleCreateUserFormChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="businessJustification" className="text-sm font-medium text-gray-700">
          Business Justification
        </Label>
        <Textarea
          id="businessJustification"
          name="businessJustification"
          value={createUserForm.businessJustification}
          onChange={handleCreateUserFormChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
          <p className="text-gray-400">Manage users, requests, and security auditing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={loadUsers}
            variant="outline"
            size="sm"
            disabled={loadingUsers}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-blue-500">
              {users.length}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-green-500">
                  {users.filter(u => u.userStatus === 'active').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-red-500">
                  {users.filter(u => u.userStatus === 'inactive').length}
                </p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-purple-500">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-blue-500">
                  {users.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
            Users
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-white data-[state=active]:bg-red-600">
            User Requests
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-white data-[state=active]:bg-red-600">
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="create" className="text-white data-[state=active]:bg-red-600">
            Create User
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Active Users ({users.length})
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage existing users and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-400">Loading users...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Email</TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Company</TableHead>
                      <TableHead className="text-gray-300">Last Sign In</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((mergedUser) => (
                      <TableRow key={mergedUser.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {mergedUser.fullName || 'Unnamed User'}
                            </p>
                            {mergedUser.jobTitle && (
                              <p className="text-xs text-gray-400">{mergedUser.jobTitle}</p>
                            )}
                            {mergedUser.department && (
                              <p className="text-xs text-gray-500">{mergedUser.department}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.email}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(mergedUser.role)}
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(mergedUser.userStatus)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.companyName || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {mergedUser.lastSignInAt ? 
                            new Date(mergedUser.lastSignInAt).toLocaleDateString() : 
                            'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => {
                                setSelectedUserToEdit(mergedUser);
                                setIsEditDialogOpen(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">User Requests</CardTitle>
              <CardDescription className="text-gray-400">
                Review and approve user access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserRequestsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Security Audit Log</CardTitle>
              <CardDescription className="text-gray-400">
                System security events and user activity monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Create New User
              </CardTitle>
              <CardDescription className="text-gray-400">
                Create a new user account with specified role and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderCreateUserForm()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
      <UserEditDialog
        user={selectedUserToEdit}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedUserToEdit(null);
        }}
        onSave={handleUpdateUser}
      />
    </div>
  );
};

export default UserManagement;
