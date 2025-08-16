
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRegistrationRequest } from "@/types/user-management";
import { Shield, User, Mail, Phone, Building, FileText, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LegalDocumentModal from "@/components/admin/LegalDocumentModal";

interface UserRegistrationFormProps {
  onSubmit?: (data: Partial<UserRegistrationRequest>) => void;
  onBack?: () => void;
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
    requestedRole: 'level1' as 'level1' | 'level2',
    managerEmail: '',
    companyName: '',
    agreedToTerms: false,
    agreedToPrivacyPolicy: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreedToTerms || !formData.agreedToPrivacyPolicy) {
      alert('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Insert into real database
      const { error } = await supabase
        .from('user_requests')
        .insert({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: `${formData.firstName} ${formData.lastName}`,
          requested_role: formData.requestedRole,
          department: formData.department,
          job_title: formData.jobTitle,
          phone_number: formData.phoneNumber,
          manager_email: formData.managerEmail,
          company_name: formData.companyName,
          business_justification: formData.businessJustification,
          ip_address: '127.0.0.1', // In a real app, get actual IP
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Registration request submitted to database');
      
      alert('Registration request submitted successfully! You will receive an email once your request has been reviewed.');
      
      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        department: '',
        jobTitle: '',
        phoneNumber: '',
        businessJustification: '',
        requestedRole: 'level1',
        managerEmail: '',
        companyName: '',
        agreedToTerms: false,
        agreedToPrivacyPolicy: false
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return formData.email &&
           formData.firstName &&
           formData.lastName &&
           formData.department &&
           formData.jobTitle &&
           formData.phoneNumber &&
           formData.businessJustification &&
           formData.managerEmail &&
           formData.companyName &&
           formData.agreedToTerms &&
           formData.agreedToPrivacyPolicy;
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            )}
            <div className="flex-1" />
          </div>
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center">
            <Shield className="mr-2 h-6 w-6 text-red-600" />
            Request Access to PowerQuotePro
          </CardTitle>
          <CardDescription className="text-gray-400">
            Complete this form to request access to the system. Your request will be reviewed by an administrator.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="border-b border-gray-700 pb-2">
                <h3 className="text-white font-semibold text-lg flex items-center">
                  <User className="mr-2 h-5 w-5 text-red-600" />
                  Personal Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-white font-medium mb-2 block">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="lastName" className="text-white font-medium mb-2 block">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-white font-medium mb-2 block">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-white font-medium mb-2 block">
                  Phone Number *
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            {/* Company Information Section */}
            <div className="space-y-4">
              <div className="border-b border-gray-700 pb-2">
                <h3 className="text-white font-semibold text-lg flex items-center">
                  <Building className="mr-2 h-5 w-5 text-red-600" />
                  Company Information
                </h3>
              </div>

              <div>
                <Label htmlFor="companyName" className="text-white font-medium mb-2 block">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                  placeholder="Enter your company name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department" className="text-white font-medium mb-2 block">
                    Department *
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="e.g., Sales, Engineering"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="jobTitle" className="text-white font-medium mb-2 block">
                    Job Title *
                  </Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                    placeholder="Enter your job title"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="managerEmail" className="text-white font-medium mb-2 block">
                  Manager Email *
                </Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                  placeholder="Enter your manager's email"
                  required
                />
              </div>
            </div>

            {/* Access Request Section */}
            <div className="space-y-4">
              <div className="border-b border-gray-700 pb-2">
                <h3 className="text-white font-semibold text-lg flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-red-600" />
                  Access Request Details
                </h3>
              </div>

              <div>
                <Label htmlFor="requestedRole" className="text-white font-medium mb-2 block">
                  Requested Access Level *
                </Label>
                <Select value={formData.requestedRole} onValueChange={(value: 'level1' | 'level2') => handleInputChange('requestedRole', value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 z-50">
                    <SelectItem value="level1" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                      Level 1 (Basic Access)
                    </SelectItem>
                    <SelectItem value="level2" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                      Level 2 (Full Access with Pricing)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-gray-400 text-sm mt-1">
                  Level 1: Can create quotes without seeing prices. Level 2: Full access including pricing information.
                </p>
              </div>

              <div>
                <Label htmlFor="businessJustification" className="text-white font-medium mb-2 block">
                  Business Justification *
                </Label>
                <Textarea
                  id="businessJustification"
                  value={formData.businessJustification}
                  onChange={(e) => handleInputChange('businessJustification', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500 min-h-[100px]"
                  placeholder="Please explain why you need access to this system and how you plan to use it..."
                  required
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="border-b border-gray-700 pb-2">
                <h3 className="text-white font-semibold text-lg">Terms and Conditions</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={formData.agreedToTerms}
                    onCheckedChange={(checked) => handleInputChange('agreedToTerms', checked as boolean)}
                    className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <Label htmlFor="terms" className="text-white text-sm leading-relaxed">
                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-red-400 hover:text-red-300 underline">Terms of Service</button> and understand that this system is for authorized business use only. 
                    I acknowledge that all activities may be monitored and logged for security purposes.
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.agreedToPrivacyPolicy}
                    onCheckedChange={(checked) => handleInputChange('agreedToPrivacyPolicy', checked as boolean)}
                    className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <Label htmlFor="privacy" className="text-white text-sm leading-relaxed">
                    I agree to the <button type="button" onClick={() => setShowPrivacy(true)} className="text-red-400 hover:text-red-300 underline">Privacy Policy</button> and understand how my personal information will be collected, 
                    used, and protected in accordance with applicable privacy laws.
                  </Label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                disabled={!isFormValid() || isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting Request...' : 'Request Access'}
              </Button>
              
              <p className="text-gray-400 text-sm text-center mt-3">
                Your request will be reviewed by an administrator. You will receive an email notification once your request has been processed.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Legal Document Modals */}
      <LegalDocumentModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        documentType="terms"
      />
      <LegalDocumentModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        documentType="privacy"
      />
    </div>
  );
};

export default UserRegistrationForm;
