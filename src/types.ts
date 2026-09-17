export type SpeakerRole = 'pharmacist' | 'customer' | 'unknown';

export interface DialogueTurn {
  speaker: SpeakerRole;
  speakerLabel: string; // e.g. "Əczaçı / Фармацевт" or "Müştəri / Покупатель"
  originalText: string; // Transcribed text preserving mixed Azeri & Russian
  detectedLanguage: 'az' | 'ru' | 'mixed';
  timestampEstimate?: string;
  keyPhonemesOrTerms?: string[];
}

export interface MedicalEntity {
  term: string; // e.g., "Kardiomaqnil", "Spasmalqon", "Nimesil"
  innOrGeneric: string; // e.g., "Acetylsalicylic acid + Magnesium hydroxide"
  dosageOrForm?: string; // e.g., "75 mg", "tablet", "sirop 100 ml"
  category: string; // e.g., "Kardiologiya", "Ağrıkəsici / İltihab əleyhinə (NSAID)"
  prescriptionStatus: 'OTC' | 'Prescription (Reseptli)';
  statusInDialog: 'purchased' | 'inquired_not_purchased' | 'out_of_stock' | 'alternative_suggested' | 'refused';
  notes?: string;
}

export interface SaleAnalysis {
  saleOccurred: boolean; // true if sale completed, false if not
  confidenceScore: number; // 0 - 100%
  verdictTitle: string; // e.g., "Satış Tamamlandı / Продажа состоялась"
  verdictExplanation: string; // Thorough explanation of why sale concluded or failed
  decisiveEvidence: string[]; // Specific spoken quotes/triggers (e.g. "kartla ödəyirəm", "baha oldu")
  nonSaleReason?: 'out_of_stock' | 'price_objection' | 'prescription_missing' | 'inquiry_only' | 'alternative_rejected' | 'other';
  nonSaleReasonDescription?: string;
  transactionDetails?: {
    currency: string;
    totalAmount?: number;
    paymentMethod?: 'cash' | 'card' | 'unknown';
    itemsCount?: number;
  };
}

export interface PharmacyAnalysisResult {
  id: string;
  timestamp: string;
  audioDurationSeconds?: number;
  fileName?: string;
  transcript: {
    fullText: string;
    languageMix: {
      azeriPercentage: number;
      russianPercentage: number;
    };
    turns: DialogueTurn[];
  };
  medicalEntities: MedicalEntity[];
  saleAnalysis: SaleAnalysis;
  pharmacistConsultationScore?: {
    greetingPoliteness: 'excellent' | 'good' | 'neutral' | 'poor';
    dosageExplanationProvided: boolean;
    prescriptionChecked: boolean;
    notes: string;
  };
}

export interface SampleRecordingPreset {
  id: string;
  title: string;
  subtitle: string;
  category: 'sale_success' | 'sale_failed';
  badge: string;
  description: string;
  dialoguePreview: string;
  expectedOutcome: 'Sale' | 'No Sale';
  dialogueScript: Array<{ speaker: 'pharmacist' | 'customer'; text: string }>;
}
