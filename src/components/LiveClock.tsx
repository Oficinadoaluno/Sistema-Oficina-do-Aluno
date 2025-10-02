import React, { useState, useEffect } from 'react';
import { ClockIcon } from './Icons';

const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-medium bg-zinc-100 px-2 py-1 rounded-md">
            <ClockIcon className="h-4 w-4" />
            <span>{time.toLocaleTimeString('pt-BR')}</span>
        </div>
    );
};

export default LiveClock;
