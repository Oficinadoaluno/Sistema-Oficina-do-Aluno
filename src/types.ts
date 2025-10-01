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
    hasMonthlyPlan?: boolean;
    aiSummary?: {
        summary: string;
        lastUpdated: string; // YYYY-MM-DD
    };
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
  fixedSalary?: number;
  // System Access
  login?: string;
  availability?: WeeklyAvailability;
}


// --- Financial Types ---

export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'outro' | string;
export type CardPaymentMethod = 'maquininha' | 'link' | 'outro';

export interface Transaction {
  id: string;
  type: 'credit' | 'monthly' | 'payment';
  date: string; // Paid date for filtering
  amount: number;
  paymentMethod: PaymentMethod;
  registeredById: string;
  // Student/Prof specific
  month?: string;
  studentId?: string;
  professionalId?: string;
  classId?: string; // Link to the specific class paid for
  cardDetails?: {
    method: CardPaymentMethod;
    details?: string;
    installments?: number;
    fees?: number;
  };
  discount?: number;
  surcharge?: number;
  // Generic transaction fields
  sourceDest?: string;
  description?: string;
  category?: string;
  dueDate?: string;
  status?: 'pago' | 'pendente';
}

// --- Continuity and Report Types ---
export interface ClassReport {
  mood: string; // emoji character or custom text
  contents: { discipline: string; content: string }[];
  description: string;
  nextSteps?: string[]; // Replaces continuity plan
  homeworkAssigned?: boolean;
  testRecord?: {
    type: string;
    maxScore: number;
    studentScore: number;
  };
}

export interface PastClassForProfessional {
    id: string;
    student: string;
    subject: string;
    date: string;
    report: string;
}

// --- Class Package Types ---
export interface ClassPackage {
  id: string;
  studentId: string;
  studentName: string; // denormalized for easy display
  totalHours: number;
  purchaseDate: string; // YYYY-MM-DD
  totalValue: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'pending';
  pendingAmountDueDate?: string;
  observations?: string;
  status: 'active' | 'completed' | 'canceled';
  transactionId?: string;
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
  location?: 'online' | 'presencial';
  reportRegistered: boolean;
  status: 'scheduled' | 'completed' | 'canceled' | 'rescheduled';
  statusChangeReason?: string;
  report?: ClassReport;
  packageId?: string;
  paymentStatus?: 'paid' | 'free' | 'package' | 'pending';
  transactionId?: string;
}

// --- Class Group Types ---
export interface ClassGroupSchedule {
    type: 'recurring' | 'single';
    // For recurring
    days?: { [key in DayOfWeek]?: { start: string; end: string } }; // e.g. { segunda: { start: '14:00', end: '15:30' } }
    // For single
    date?: string;
    time?: string;
    endTime?: string;
}

export interface ClassGroup {
    id: string;
    name: string;
    description: string;
    studentIds: string[];
    professionalId: string;
    schedule: ClassGroupSchedule;
    discipline?: string;
    status: 'active' | 'archived';
    color?: string;
    type?: 'group' | 'plan';
}

export interface GroupClassReport {
  id: string;
  groupId: string;
  studentId: string;
  date: string; // YYYY-MM-DD format to match the class instance
  report: ClassReport;
}

export interface GroupAttendance {
  id: string;
  groupId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  justification?: string;
}

export interface GroupStudentDailyReport {
    id: string;
    groupId: string;
    studentId: string;
    date: string; // YYYY-MM-DD
    subjects: { discipline: string; activity: string }[];
    observations: string;
}


// --- System & Collaborator Types ---
export type SystemPanel = 'admin' | 'teacher';

export interface AdminPermissions {
    canAccessStudents: boolean;
    canAccessProfessionals: boolean;
    canAccessClassGroups: boolean;
    canAccessAgenda: boolean;
    canAccessFinancial: boolean;
    canAccessSettings: boolean;
    canAccessPackages: boolean;
    canAccessPricing: boolean;
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

export interface PricingTier {
  quantity: number;
  pricePerUnit: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  pricingTiers: PricingTier[];
  discountPercentage?: number;
}