/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IssueStatus = 'reported' | 'verified' | 'in-progress' | 'resolved';
export type UserRole = 'citizen' | 'administration' | 'contractor';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  location: Location;
  imageUrl?: string;
  reportedBy: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  votesCount: number;
  aiCategory?: string;
  aiConfidence?: number;
  impactScore: number;
  // New fields
  predictedEffects?: string;
  dangerLevel?: string;
  budget?: number;
  suggestions?: string;
  resolvedImageUrl?: string;
  videoUrl?: string;
  // Hero assignment fields
  assignedHeroId?: string;
  assignedHeroName?: string;
  assignedHeroType?: string;
  assignedHeroPhone?: string;
  assignedHeroVerified?: boolean;
  escalated?: boolean;
  escalationLetter?: string;
  escalationPost?: string;
  // Structural diagnostics fields
  structuralIntegrity?: number;
  yearsToFailure?: number;
  identifiedDefects?: string[];
  remediationAction?: string;
  // Public Transit fields
  isTransitIssue?: boolean;
  vehicleNumber?: string;
  transitAuthority?: 'RTC' | 'IRCTC' | null;
  depotHoldDate?: string;
  depotHoldStatus?: 'scheduled' | 'active' | 'released' | null;
  // Chronic location fields
  chronicReportCount?: number;
  totalTaxpayerSpend?: number;
  // Vertex AI Government Agent fields
  governmentGuidance?: {
    department: string;
    category: string;
    priority: string;
    law: string;
    documents: string[];
    officer: string;
    timeline: string;
    escalation: string;
    citizen_advice: string;
    damageCause: 'Heavy Vehicle Traffic' | 'Accidental Damage' | 'Public Damage' | 'General Wear';
    damageReasoning: string;
    govActionRequired: boolean;
    evidenceRequired?: string[];
    nextSteps?: string[];
  };
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  points: number;
  rank: string;
  role: UserRole;
  createdAt: string;
  username?: string;
  password?: string;
  // Hero workforce profile fields
  isHero?: boolean;
  heroType?: 'plumber' | 'electrician' | 'pole_man' | 'ghmc_corporator' | 'construction_worker';
  isGovWorker?: boolean;
  govIdNumber?: string;
  govProofUrl?: string;
  govVerificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  serviceLocation?: Location;
  phoneNumber?: string;
  heroPhotoUrl?: string;
  // Contractor specific fields
  contractorCompany?: string;
  contractorLicense?: string;
  isBlacklisted?: boolean;
  // Corporator specific fields
  corporatorWard?: string;
  corporatorId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'issue_resolved' | 'issue_verified' | 'general';
  issueId?: string;
  read: boolean;
  createdAt: string;
}

export interface Vote {
  issueId: string;
  userId: string;
  createdAt: string;
}

export interface Tender {
  id: string;
  issueId?: string;
  title: string;
  description: string;
  estimatedBudget: number;
  status: 'open' | 'awarded' | 'closed';
  createdAt: string;
  deadline: string;
  bids: TenderBid[];
  // Corporator posting fields
  postedBy?: string;
  postedByName?: string;
  wardName?: string;
  category?: 'road' | 'water' | 'electric' | 'structure' | 'other';
}

export interface TenderBid {
  contractorId: string;
  contractorName: string;
  bidAmount: number;
  proposal: string;
  submittedAt: string;
}

export interface ContractStage {
  id: string;
  title: string;
  description: string;
  targetDay: number;
  status: 'pending' | 'completed' | 'delayed';
  metric: string;
  imageUrl?: string;
  progressNotes?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface Contract {
  id: string;
  tenderId: string;
  issueId?: string;
  contractorId: string;
  contractorName: string;
  tenderTitle: string;
  status: 'active' | 'completed' | 'violated' | 'cancelled';
  agreedAmount: number;
  startDate: string;
  completionDate?: string;
  defectLiabilityPeriodDays: number;
  stages: ContractStage[];
  cancelledAt?: string;
  cancellationReason?: string;
}

