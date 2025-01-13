'use client';

import { useEffect } from 'react';

interface SessionHandlerProps {
    session: any;
}

const SessionHandler = ({ session }: SessionHandlerProps) => {
    useEffect(() => {
        if (session) {
            sessionStorage.setItem('cookie', JSON.stringify(session));
        }
    }, [session]);

    return null;
};

export default SessionHandler; 