import React from 'react';
import {
  ArrowLeftIcon as HeroArrowLeftIcon,
  PlusIcon as HeroPlusIcon,
  XMarkIcon as HeroXMarkIcon,
  CheckCircleIcon as HeroCheckCircleIcon,
  ExclamationTriangleIcon as HeroExclamationTriangleIcon,
  InformationCircleIcon as HeroInformationCircleIcon,
  UsersIcon as HeroUsersIcon,
  MagnifyingGlassIcon as HeroMagnifyingGlassIcon,
  ChevronDownIcon as HeroChevronDownIcon,
  TrashIcon as HeroTrashIcon,
  CheckIcon as HeroCheckIcon,
  ChartPieIcon as HeroChartPieIcon,
  PhoneIcon as HeroPhoneIcon,
  UserIcon as HeroUserIcon,
  GiftIcon as HeroBirthdayIcon,
  BellIcon as HeroAlertIcon,
  BookOpenIcon as HeroBookOpenIcon,
  CalendarIcon as HeroCalendarIcon,
  CurrencyDollarIcon as HeroCurrencyDollarIcon,
  Cog6ToothIcon as HeroCog6ToothIcon,
  ArrowRightOnRectangleIcon as HeroArrowRightOnRectangleIcon,
  UserPlusIcon as HeroUserPlusIcon,
  DocumentTextIcon as HeroDocumentTextIcon,
  IdentificationIcon as HeroIdentificationIcon,
  LockClosedIcon as HeroLockClosedIcon,
  BanknotesIcon as HeroBanknotesIcon,
  CalendarDaysIcon as HeroCalendarDaysIcon,
  CreditCardIcon as HeroCreditCardIcon,
  KeyIcon as HeroKeyIcon,
  ClockIcon as HeroClockIcon,
  UserMinusIcon as HeroUserMinusIcon,
  PencilIcon as HeroPencilIcon,
  ClipboardDocumentIcon as HeroClipboardDocumentIcon,
  ChevronLeftIcon as HeroChevronLeftIcon,
  ChevronRightIcon as HeroChevronRightIcon,
  ArchiveBoxIcon as HeroArchiveBoxIcon,
  ArchiveBoxXMarkIcon as HeroArchiveBoxXMarkIcon,
  UserGroupIcon as HeroUserGroupIcon,
  FunnelIcon as HeroFunnelIcon,
  EyeIcon as HeroEyeIcon,
  EyeSlashIcon as HeroEyeSlashIcon,
  ArrowUpIcon as HeroArrowUpIcon,
  ArrowDownIcon as HeroArrowDownIcon,
  ClipboardDocumentCheckIcon as HeroClipboardDocumentCheckIcon,
  XCircleIcon as HeroXCircleIcon,
  ComputerDesktopIcon as HeroComputerDesktopIcon,
  BuildingOffice2Icon as HeroBuildingOffice2Icon,
  AcademicCapIcon as HeroAcademicCapIcon,
  Bars3Icon as HeroBars3Icon,
  ArrowPathIcon as HeroArrowPathIcon,
  EnvelopeIcon as HeroEnvelopeIcon,
  ArrowTopRightOnSquareIcon as HeroArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import {
  CheckBadgeIcon as HeroCheckBadgeIcon,
  SparklesIcon as HeroSparklesIcon,
} from '@heroicons/react/24/solid';

export const LogoPlaceholder: React.FC = () => (
  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
    <span className="text-lg font-bold text-primary">OA</span>
  </div>
);

export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroUserIcon className={className} {...props} />
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement> & { open?: boolean }> = ({ open, className = "h-5 w-5", ...props }) => {
    const finalClassName = `${className} transition-transform ${open ? 'rotate-180' : ''}`;
    return <HeroChevronDownIcon className={finalClassName} {...props} />;
};

export const BirthdayIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroBirthdayIcon className={className} {...props} />
);

export const AlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroAlertIcon className={className} {...props} />
);

export const BookOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroBookOpenIcon className={className} {...props} />
);

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroUsersIcon className={className} {...props} />
);

export const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroCalendarIcon className={className} {...props} />
);

export const CurrencyDollarIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroCurrencyDollarIcon className={className} {...props} />
);

export const Cog6ToothIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroCog6ToothIcon className={className} {...props} />
);

export const ArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
    <HeroArrowRightOnRectangleIcon className={className} {...props} />
);

export const UserPlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroUserPlusIcon className={className} {...props} />
);

export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroDocumentTextIcon className={className} {...props} />
);

export const IdentificationIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
    <HeroIdentificationIcon className={className} {...props} />
);

export const LockClosedIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
    <HeroLockClosedIcon className={className} {...props} />
);

export const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroArrowLeftIcon className={className} {...props} />
);

export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroCheckCircleIcon className={className} {...props} />
);

export const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroExclamationTriangleIcon className={className} {...props} />
);

export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroXMarkIcon className={className} {...props} />
);

export const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroInformationCircleIcon className={className} {...props} />
);

export const BanknotesIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
  <HeroBanknotesIcon className={className} {...props} />
);

export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroCalendarDaysIcon className={className} {...props} />
);

export const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroMagnifyingGlassIcon className={className} {...props} />
);

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroPlusIcon className={className} {...props} />
);

export const CreditCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroCreditCardIcon className={className} {...props} />
);

export const KeyIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroKeyIcon className={className} {...props} />
);

export const CheckBadgeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroCheckBadgeIcon className={className} {...props} />
);

export const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
  <HeroClockIcon className={className} {...props} />
);

export const UserMinusIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroUserMinusIcon className={className} {...props} />
);

export const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
  <HeroPencilIcon className={className} {...props} />
);

export const ClipboardDocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroClipboardDocumentIcon className={className} {...props} />
);

export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroChevronLeftIcon className={className} {...props} />
);

export const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroChevronRightIcon className={className} {...props} />
);

export const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroCheckIcon className={className} {...props} />
);

export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroArchiveBoxIcon className={className} {...props} />
);

export const ArchiveBoxXMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroArchiveBoxXMarkIcon className={className} {...props} />
);

export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroUserGroupIcon className={className} {...props} />
);

export const FunnelIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroFunnelIcon className={className} {...props} />
);

export const ChartPieIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroChartPieIcon className={className} {...props} />
);

export const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroPhoneIcon className={className} {...props} />
);

export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroEyeIcon className={className} {...props} />
);

export const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroEyeSlashIcon className={className} {...props} />
);

export const ArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroArrowUpIcon className={className} {...props} />
);

export const ArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroArrowDownIcon className={className} {...props} />
);

export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
  <HeroTrashIcon className={className} {...props} />
);

export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroSparklesIcon className={className} {...props} />
);

export const ClipboardDocumentCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroClipboardDocumentCheckIcon className={className} {...props} />
);

export const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroXCircleIcon className={className} {...props} />
);

export const ComputerDesktopIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroComputerDesktopIcon className={className} {...props} />
);

export const BuildingOffice2Icon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
  <HeroBuildingOffice2Icon className={className} {...props} />
);

export const AcademicCapIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroAcademicCapIcon className={className} {...props} />
);

export const Bars3Icon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroBars3Icon className={className} {...props} />
);

export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroArrowPathIcon className={className} {...props} />
);

export const EnvelopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroEnvelopeIcon className={className} {...props} />
);

export const ArrowTopRightOnSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-6 w-6", ...props }) => (
    <HeroArrowTopRightOnSquareIcon className={className} {...props} />
);