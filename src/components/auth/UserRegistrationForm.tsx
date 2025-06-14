
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserRegistrationRequest } from "@/types/user";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRegistrationFormProps {
  onBack: () => void;
}

const UserRegistrationForm = ({ onBack }: UserRegistrationFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<UserRegistrationRequest>({
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    role: 'level1',
    businessJustification: '',
    managerName: '',
    managerEmail: '',
    phoneNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!formData.email.endsWith('@qualitrol.com')) {
      newErrors.email = 'Please use your @qualitrol.com email address';
    }

    // Required field validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.businessJustification.trim()) {
      newErrors.businessJustification = 'Business justification is required';
    } else if (formData.businessJustification.trim().length < 20) {
      newErrors.businessJustification = 'Please provide at least 20 characters of justification';
    }
    if (!formData.managerName.trim()) newErrors.managerName = 'Manager name is required';
    
    // Manager email validation
    if (!formData.managerEmail) {
      newErrors.managerEmail = 'Manager email is required';
    } else if (!emailRegex.test(formData.managerEmail)) {
      newErrors.managerEmail = 'Please enter a valid manager email address';
    }

    // Phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserRegistrationRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call - in real implementation, this would be a server request
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const registrationRequest = {
        ...formData,
        id: `REQ-${Date.now()}`,
        requestedAt: new Date().toISOString(),
        status: 'pending' as const
      };
      
      console.log('User registration request submitted:', registrationRequest);
      
      toast({
        title: "Registration Request Submitted",
        description: "Your access request has been submitted for admin approval. You will receive an email notification once processed.",
      });
      
      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        department: '',
        role: 'level1',
        businessJustification: '',
        managerName: '',
        managerEmail: '',
        phoneNumber: ''
      });
      
      onBack();
      
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit registration request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Shield className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-3xl font-bold text-white">Request Account Access</h2>
        <p className="mt-2 text-gray-400">PowerQuotePro - Qualitrol Transformer Solutions</p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-400 hover:text-white p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-white">Account Access Request</CardTitle>
              <CardDescription className="text-gray-400">
                Complete this form to request access to PowerQuotePro
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Security Notice</p>
                <p>All access requests require admin approval and manager verification. You will receive email notifications at each step of the process.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.firstName ? 'border-red-500' : ''}`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-white">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-white">Work Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`bg-gray-800 border-gray-700 text-white ${errors.email ? 'border-red-500' : ''}`}
                placeholder="yourname@qualitrol.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="text-white">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className={`bg-gray-800 border-gray-700 text-white ${errors.phoneNumber ? 'border-red-500' : ''}`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phoneNumber && <p className="text-red-400 text-sm mt-1">{errors.phoneNumber}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department" className="text-white">Department *</Label>
                <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                  <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${errors.department ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="it">Information Technology</SelectItem>
                  </SelectContent>
                </Select>
                {errors.department && <p className="text-red-400 text-sm mt-1">{errors.department}</p>}
              </div>
              <div>
                <Label htmlFor="role" className="text-white">Requested Access Level *</Label>
                <Select value={formData.role} onValueChange={(value: 'level1' | 'level2') => handleInputChange('role', value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="level1">Level 1 - Basic Quoting</SelectItem>
                    <SelectItem value="level2">Level 2 - Advanced Quoting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="managerName" className="text-white">Direct Manager Name *</Label>
                <Input
                  id="managerName"
                  type="text"
                  value={formData.managerName}
                  onChange={(e) => handleInputChange('managerName', e.target.value)}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.managerName ? 'border-red-500' : ''}`}
                  placeholder="Enter your manager's full name"
                />
                {errors.managerName && <p className="text-red-400 text-sm mt-1">{errors.managerName}</p>}
              </div>
              <div>
                <Label htmlFor="managerEmail" className="text-white">Manager Email *</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.managerEmail ? 'border-red-500' : ''}`}
                  placeholder="manager@qualitrol.com"
                />
                {errors.managerEmail && <p className="text-red-400 text-sm mt-1">{errors.managerEmail}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="businessJustification" className="text-white">Business Justification *</Label>
              <Textarea
                id="businessJustification"
                value={formData.businessJustification}
                onChange={(e) => handleInputChange('businessJustification', e.target.value)}
                className={`bg-gray-800 border-gray-700 text-white ${errors.businessJustification ? 'border-red-500' : ''}`}
                placeholder="Please explain why you need access to PowerQuotePro and how it will support your role..."
                rows={4}
              />
              <p className="text-gray-400 text-xs mt-1">
                {formData.businessJustification.length}/500 characters (minimum 20 required)
              </p>
              {errors.businessJustification && <p className="text-red-400 text-sm mt-1">{errors.businessJustification}</p>}
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting Request..." : "Submit Access Request"}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-3 bg-gray-800 rounded-lg">
            <p className="text-gray-300 text-sm mb-2 font-medium">What happens next?</p>
            <ol className="text-gray-400 text-xs space-y-1">
              <li>1. Your manager will receive an email to verify your request</li>
              <li>2. Admin team will review your application and business justification</li>
              <li>3. You'll receive email notification of approval/rejection</li>
              <li>4. If approved, you'll receive temporary login credentials</li>
              <li>5. You'll be required to change your password on first login</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRegistrationForm;
