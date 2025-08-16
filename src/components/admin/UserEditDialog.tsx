
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface User {
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
}

interface UserEditDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
}

export default function UserEditDialog({ user, isOpen, onClose, onSave }: UserEditDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('level1');
  const [userStatus, setUserStatus] = useState('active');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessJustification, setBusinessJustification] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update form when user changes
  useEffect(() => {
    if (user) {
      const nameParts = user.fullName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setRole(user.role);
      setUserStatus(user.userStatus);
      setDepartment(user.department || '');
      setJobTitle(user.jobTitle || '');
      setPhoneNumber(user.phoneNumber || '');
      setManagerEmail(user.managerEmail || '');
      setCompanyName(user.companyName || '');
      setBusinessJustification(user.businessJustification || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await onSave({
        id: user.id,
        firstName,
        lastName,
        role,
        userStatus,
        department,
        jobTitle,
        phoneNumber,
        managerEmail,
        companyName,
        businessJustification,
        email: user.email
      });
      
      toast({
        title: "Success",
        description: "User updated successfully!",
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit User Profile</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-400">Email (Read-only)</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-gray-800 border-gray-700 text-gray-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-gray-400">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-gray-400">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role" className="text-gray-400">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="level1">Level 1 (Channel partners)</SelectItem>
                  <SelectItem value="level2">Level 2 (Qualitrol Sales)</SelectItem>
                  <SelectItem value="level3">Level 3 (Directors)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-gray-400">Status</Label>
              <Select value={userStatus} onValueChange={setUserStatus}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department" className="text-gray-400">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g. Engineering, Sales"
              />
            </div>
            <div>
              <Label htmlFor="jobTitle" className="text-gray-400">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phoneNumber" className="text-gray-400">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="companyName" className="text-gray-400">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Company name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="managerEmail" className="text-gray-400">Manager Email</Label>
            <Input
              id="managerEmail"
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="manager@company.com"
            />
          </div>

          <div>
            <Label htmlFor="businessJustification" className="text-gray-400">Business Justification</Label>
            <Textarea
              id="businessJustification"
              value={businessJustification}
              onChange={(e) => setBusinessJustification(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Business justification for access..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
