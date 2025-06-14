
export interface PendingUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: 'level1' | 'level2';
  businessJustification: string;
  managerName: string;
  managerEmail: string;
  phoneNumber: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface UserRegistrationRequest {
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: 'level1' | 'level2';
  businessJustification: string;
  managerName: string;
  managerEmail: string;
  phoneNumber: string;
}
