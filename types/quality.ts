
export type QualityCheckStatus = 'pending' | 'passed' | 'failed' | 'conditional';
export type QualityCheckType = 'incoming' | 'production' | 'final' | 'storage';
export type RelatedEntityType = 'ProductionOrder' | 'WarehouseItem' | 'PurchaseRequest';

export interface QualityParameter {
  id: string;
  name: string;
  normativeValue: string; // e.g. "10-12%" or "White"
  actualValue?: string;
  isCritical: boolean;
  passed?: boolean;
}

export interface QualityCheck {
  id: string;
  checkNumber: string;
  type: QualityCheckType;
  status: QualityCheckStatus;
  
  relatedEntityId: string;
  relatedEntityName?: string; // Helper for UI
  relatedEntityType: RelatedEntityType;
  
  inspectorId?: string;
  inspectorName?: string;
  date: string; // Created at / Scheduled for
  completedAt?: string;
  
  parameters: QualityParameter[];
  notes?: string;
  
  // Links
  generatedIncidentId?: string;
}
