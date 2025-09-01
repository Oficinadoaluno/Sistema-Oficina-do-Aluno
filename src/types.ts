export enum UserRole {
  Admin = 'Administração',
  Teacher = 'Professores',
}

export interface Student {
    id: string;
    name: string;
    guardian: string;
    school: string;
    grade: string;
    status: 'matricula' | 'prospeccao' | 'inativo';
    credits: number;
    hasMonthlyPlan?: boolean;
    // Registration details
    birthDate?: string;
    schoolUnit?: string;
    neurodiversity?: string;
    objective?: string;
    phone?: string;
    email?: string;
    schoolLogin?: string;
    schoolPassword?: string;
    didacticMaterial?: string;
    medications?: string;
    motherName?: string;
    fatherName?: string;
    financialGuardian?: 'mae' | 'pai' | 'outro';
    otherGuardianName?: string;
    guardianAddress?: string;
    guardianPhone?: string;
    guardianMobile?: string;
    guardianEmail?: string;
    guardianCpf?: string;
}

// --- Professional Types ---
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

export type WeeklyAvailability = {
  [key in DayOfWeek]?: string[];
};

export interface Professional {
  id: string;
  name: string;
  disciplines: string[];
  status: 'ativo' | 'inativo';
  // Personal Info
  birthDate?: string;
  cpf?: string;
  address?: string;
  phone: string;
  email?: string;
  currentSchool?: string;
  // Academic Info
  education?: string;
  certifications?: string;
  // Financial Info
  pixKey?: string;
  bank?: string;
  agency?: string;
  account?: string;
  hourlyRateIndividual?: number;
  hourlyRateGroup?: number;
  // System Access
  login?: string;
  availability?: WeeklyAvailability;
}


// --- Financial Types ---

export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'outro';
export type CardPaymentMethod = 'maquininha' | 'link' | 'outro';

export interface Transaction {
  id: string;
  type: 'credit' | 'monthly' | 'payment';
  date: string;
  amount: number;
  credits?: number;
  month?: string;
  paymentMethod: PaymentMethod;
  cardDetails?: {
    method: CardPaymentMethod;
    details?: string;
    installments?: number;
    fees?: number;
  };
  discount?: number;
  surcharge?: number;
  registeredById: string;
  studentId?: string; // Link transaction to a student
  professionalId?: string;
}

// --- Continuity and Report Types ---
export type ContinuityStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';

export interface ContinuityItem {
  id: string;
  studentId: string;
  description: string;
  status: ContinuityStatus;
  createdBy: string; // professionalId
  createdAt: string; // YYYY-MM-DD
}

export interface ClassReport {
  contents: { discipline: string; content: string }[];
  description: string;
  continuityCreated?: { description: string; status: ContinuityStatus }[];
  continuityUpdates?: { id: string; newStatus: ContinuityStatus }[];
  mood?: string; // emoji character or custom text
  skills?: string;
  difficulties?: string;
  exerciseInstructions?: string;
  exercisesDismissed: boolean;
  dismissalReason?: string;
}

export interface PastClassForProfessional {
    id: string;
    student: string;
    subject: string;
    date: string;
    report: string;
}

// --- Diagnostic Report Types ---
export interface SchoolGrade {
  discipline: string;
  grade: string;
  observations?: string;
}

export interface DiagnosticReport {
  anamnesis: {
    studentComplaint: string;
    familyComplaint: string;
    neurodiversityInfo: string;
    therapies: string;
    medications: string;
  };
  academicPerformance: {
    gradingSystem: string;
    grades: SchoolGrade[];
    observations: string;
  };
  pedagogicalAnalysis: {
    favoriteSubjects: string;
    difficultSubjects: string;
    learningProfile: string;
    observedSkills: string;
    observedDifficulties: string;
  };
  actionPlan: {
    initialImpression: string;
    recommendedApproach: string;
    initialContinuityPlan: { description: string }[];
  };
}


// --- Agenda Types ---
export interface ScheduledClass {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  studentId: string;
  professionalId: string;
  type: 'Aula Regular' | 'Avaliação Diagnóstica' | 'Curso' | 'Outro';
  discipline: string;
  content: string;
  duration: number; // in minutes
  creditsConsumed: number;
  reportRegistered: boolean;
  status: 'scheduled' | 'completed' | 'canceled';
  report?: ClassReport;
  diagnosticReport?: DiagnosticReport;
}

// --- Class Group Types ---
export interface ClassGroupSchedule {
    type: 'recurring' | 'single';
    // For recurring
    days?: { [key in DayOfWeek]?: string }; // e.g. { segunda: '14:00', quarta: '14:00' }
    // For single
    date?: string;
    time?: string;
}

export interface ClassGroup {
    id: string;
    name: string;
    description: string;
    studentIds: string[];
    professionalId: string;
    schedule: ClassGroupSchedule;
    discipline?: string;
    creditsToDeduct: number;
    status: 'active' | 'archived';
    color?: string;
}

export interface GroupClassReport {
  id: string;
  groupId: string;
  studentId: string;
  date: string; // YYYY-MM-DD format to match the class instance
  report: ClassReport;
}

// --- System & Collaborator Types ---
export type SystemPanel = 'admin' | 'teacher' | 'student';

export interface AdminPermissions {
    canAccessStudents: boolean;
    canAccessProfessionals: boolean;
    canAccessClassGroups: boolean;
    canAccessAgenda: boolean;
    canAccessFinancial: boolean;
    canAccessSettings: boolean;
}

export interface Collaborator {
    id: string;
    name: string;
    role: string; // e.g., 'Secretária', 'Diretor'
    login: string;
    systemAccess: SystemPanel[];
    adminPermissions?: AdminPermissions;
    remunerationType?: 'fixed' | 'commission';
    fixedSalary?: number;
    commissionPercentage?: number;
    // Personal Info
    birthDate?: string;
    cpf?: string;
    address?: string;
    phone?: string;
    email?: string;
    // Financial Info
    pixKey?: string;
    bank?: string;
    agency?: string;
    account?: string;
}