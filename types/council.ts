
export type ProposalType = 
  | 'change_fund_settings' 
  | 'withdraw_fund' 
  | 'change_salary_formula'
  | 'change_system_mode' // New type
  | 'general_decision';

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface CouncilVote {
  userId: string;
  userName: string;
  decision: 'approve' | 'reject';
  timestamp: string;
  comment?: string;
}

export interface CouncilProposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  initiatorId: string;
  initiatorName: string;
  createdAt: string;
  status: ProposalStatus;
  payload: any; // Данные для автоматического исполнения (например, { newPercentage: 25 })
  votes: CouncilVote[];
  requiredApprovals: number; // Порог принятия (например, 2)
  executedAt?: string;
}
