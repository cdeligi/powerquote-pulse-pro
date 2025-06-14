
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserRegistrationRequest } from "@/types/user-management";
import { Shield, Lock, AlertTriangle, CheckCircle } from "lucide-react";

interface UserRegistrationFormProps {
  onSubmit: (request: UserRegistrationRequest) => void;
  onBack: () => void;
}

const UserRegistrationForm = ({ onSubmit, onBack }: UserRegistrationFormProps) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    businessJustification: '',
    requestedRole: '' as 'level1' | 'level2' | '',
    managerEmail: '',
    companyName: '',
    securityClearanceLevel: '',
    agreedToTerms: false,
    agreedToPrivacyPolicy: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Valid email address is required';
    }
    if (!formData.phoneNumber || !validatePhone(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Valid phone number is required';
    }
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.requestedRole) newErrors.requestedRole = 'Please select a role';
    if (!formData.managerEmail || !validateEmail(formData.managerEmail)) {
      newErrors.managerEmail = 'Valid manager email is required';
    }
    if (!formData.businessJustification.trim() || formData.businessJustification.length < 50) {
      newErrors.businessJustification = 'Business justification must be at least 50 characters';
    }
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the terms and conditions';
    }
    if (!formData.agreedToPrivacyPolicy) {
      newErrors.agreedToPrivacyPolicy = 'You must agree to the privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate security audit logging
    const auditData = {
      ipAddress: 'simulated-ip',
      userAgent: navigator.userAgent
    };

    const registrationRequest: UserRegistrationRequest = {
      id: `REG-${Date.now()}`,
      email: formData.email.toLowerCase().trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      department: formData.department.trim(),
      jobTitle: formData.jobTitle.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      businessJustification: formData.businessJustification.trim(),
      requestedRole: formData.requestedRole,
      managerEmail: formData.managerEmail.toLowerCase().trim(),
      companyName: formData.companyName.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      securityClearanceLevel: formData.securityClearanceLevel,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent,
      loginAttempts: 0,
      isLocked: false,
      twoFactorEnabled: false,
      agreedToTerms: formData.agreedToTerms,
      agreedToPrivacyPolicy: formData.agreedToPrivacyPolicy
    };

    // Simulate API call
    setTimeout(() => {
      onSubmit(registrationRequest);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Registration Request Submitted</h2>
            <p className="text-gray-400">
              Your account creation request has been submitted for administrative approval.
              You will receive an email notification once your request has been reviewed.
            </p>
            <p className="text-sm text-gray-500">
              Request ID: REG-{Date.now()}
            </p>
            <Button onClick={onBack} className="bg-red-600 hover:bg-red-700">
              Return to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-6 w-6 text-red-600" />
          <CardTitle className="text-white">Request Account Access</CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Complete this form to request access to the PowerQuotePro system. All requests require administrative approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6 border-yellow-600 bg-yellow-600/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-200">
            <strong>Security Notice:</strong> This system is for authorized personnel only. 
            Unauthorized access attempts are monitored and logged.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.firstName ? 'border-red-500' : ''}`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
              </div>
              
              <div>
                <Label htmlFor="lastName" className="text-white">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-white">Business Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`bg-gray-800 border-gray-700 text-white ${errors.email ? 'border-red-500' : ''}`}
                placeholder="your.name@company.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="text-white">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className={`bg-gray-800 border-gray-700 text-white ${errors.phoneNumber ? 'border-red-500' : ''}`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phoneNumber && <p className="text-red-400 text-sm mt-1">{errors.phoneNumber}</p>}
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Professional Information</h3>
            
            <div>
              <Label htmlFor="companyName" className="text-white">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className={`bg-gray-800 border-gray-700 text-white ${errors.companyName ? 'border-red-500' : ''}`}
                placeholder="Enter your company name"
              />
              {errors.companyName && <p className="text-red-400 text-sm mt-1">{errors.companyName}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department" className="text-white">Department *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${errors.department ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.department && <p className="text-red-400 text-sm mt-1">{errors.department}</p>}
              </div>

              <div>
                <Label htmlFor="jobTitle" className="text-white">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  className={`bg-gray-800 border-gray-700 text-white ${errors.jobTitle ? 'border-red-500' : ''}`}
                  placeholder="Enter your job title"
                />
                {errors.jobTitle && <p className="text-red-400 text-sm mt-1">{errors.jobTitle}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="managerEmail" className="text-white">Manager Email Address *</Label>
              <Input
                id="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, managerEmail: e.target.value }))}
                className={`bg-gray-800 border-gray-700 text-white ${errors.managerEmail ? 'border-red-500' : ''}`}
                placeholder="manager@company.com"
              />
              {errors.managerEmail && <p className="text-red-400 text-sm mt-1">{errors.managerEmail}</p>}
            </div>
          </div>

          {/* Access Request */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Access Request</h3>
            
            <div>
              <Label htmlFor="requestedRole" className="text-white">Requested Access Level *</Label>
              <Select value={formData.requestedRole} onValueChange={(value: 'level1' | 'level2') => setFormData(prev => ({ ...prev, requestedRole: value }))}>
                <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${errors.requestedRole ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="level1">Level 1 Sales - Basic quoting access</SelectItem>
                  <SelectItem value="level2">Level 2 Sales - Advanced quoting with discount authority</SelectItem>
                </SelectContent>
              </Select>
              {errors.requestedRole && <p className="text-red-400 text-sm mt-1">{errors.requestedRole}</p>}
            </div>

            <div>
              <Label htmlFor="securityClearanceLevel" className="text-white">Security Clearance Level (if applicable)</Label>
              <Input
                id="securityClearanceLevel"
                value={formData.securityClearanceLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, securityClearanceLevel: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g., Confidential, Secret, etc."
              />
            </div>

            <div>
              <Label htmlFor="businessJustification" className="text-white">Business Justification *</Label>
              <Textarea
                id="businessJustification"
                value={formData.businessJustification}
                onChange={(e) => setFormData(prev => ({ ...prev, businessJustification: e.target.value }))}
                className={`bg-gray-800 border-gray-700 text-white ${errors.businessJustification ? 'border-red-500' : ''}`}
                placeholder="Please provide a detailed business justification for requiring access to this system (minimum 50 characters)"
                rows={4}
              />
              <p className="text-gray-400 text-sm mt-1">
                {formData.businessJustification.length}/50 characters minimum
              </p>
              {errors.businessJustification && <p className="text-red-400 text-sm mt-1">{errors.businessJustification}</p>}
            </div>
          </div>

          {/* Agreements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Legal Agreements</h3>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="agreedToTerms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreedToTerms: checked as boolean }))}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="agreedToTerms" className="text-white text-sm cursor-pointer">
                  I agree to the Terms and Conditions and Acceptable Use Policy *
                </Label>
                {errors.agreedToTerms && <p className="text-red-400 text-sm mt-1">{errors.agreedToTerms}</p>}
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="agreedToPrivacyPolicy"
                checked={formData.agreedToPrivacyPolicy}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreedToPrivacyPolicy: checked as boolean }))}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="agreedToPrivacyPolicy" className="text-white text-sm cursor-pointer">
                  I acknowledge that I have read and understand the Privacy Policy *
                </Label>
                {errors.agreedToPrivacyPolicy && <p className="text-red-400 text-sm mt-1">{errors.agreedToPrivacyPolicy}</p>}
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 border-gray-600 text-white hover:bg-gray-800"
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Submitting Request..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserRegistrationForm;
