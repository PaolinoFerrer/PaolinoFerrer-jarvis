import React, { useState } from 'react';
import { User } from '../types.ts';

interface UserMenuProps {
    currentUser: User;
    users: User[];
    onSwitchUser: (userId: string) => void;
    onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser, users, onSwitchUser, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSwitch = (userId: string) => {
        onSwitchUser(userId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm text-jarvis-text-secondary hover:text-jarvis-primary transition-colors"
            >
                <span>{currentUser.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-jarvis-primary/20 text-jarvis-primary">
                    {currentUser.role}
                </span>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-48 bg-jarvis-surface rounded-md shadow-lg z-20 border border-jarvis-text/10"
                    onMouseLeave={() => setIsOpen(false)}
                >
                    <div className="py-1">
                        <div className="px-4 py-2 text-xs text-jarvis-text-secondary border-b border-jarvis-text/10">Cambia Utente</div>
                        {users.map(user => (
                            <button 
                                key={user.id}
                                onClick={() => handleSwitch(user.id)}
                                disabled={user.id === currentUser.id}
                                className="w-full text-left px-4 py-2 text-sm text-jarvis-text hover:bg-jarvis-bg disabled:opacity-50"
                            >
                                {user.name}
                            </button>
                        ))}
                         <div className="border-t border-jarvis-text/10 mt-1">
                            <button 
                                onClick={onLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                            >
                                Esci
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;