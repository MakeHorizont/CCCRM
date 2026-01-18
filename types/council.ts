
export type ProposalType = 
  | 'change_fund_settings' 
  | 'withdraw_fund' 
  | 'change_salary_formula'
  | 'change_system_mode'
  | 'general_decision'
  | 'technological_reform';

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'executed';

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
  payload: any; 
  votes: CouncilVote[];
  requiredApprovals: number; 
  executedAt?: string;
  executedBySystem?: boolean;
}
