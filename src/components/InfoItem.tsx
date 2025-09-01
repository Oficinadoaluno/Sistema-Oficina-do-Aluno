import React from 'react';

export const InfoItem: React.FC<{ label: string; value?: React.ReactNode; className?: string }> = ({ label, value, className }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className={className}>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="text-zinc-800 font-semibold">{value}</p>
        </div>
    );
};

export default InfoItem;