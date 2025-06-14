
export interface UserRegistrationRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  businessJustification: string;
  requestedRole: 'level1' | 'level2';
  managerEmail: string;
  companyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  securityClearanceLevel?: string;
  ipAddress: string;
  userAgent: string;
  accountExpiryDate?: string;
  lastPasswordChange?: string;
  loginAttempts: number;
  isLocked: boolean;
  twoFactorEnabled: boolean;
  agreedToTerms: boolean;
  agreedToPrivacyPolicy: boolean;
}

export interface SecurityAuditLog {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  historyCount: number; // prevent reuse of last N passwords
}
