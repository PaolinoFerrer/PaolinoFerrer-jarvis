import { User, UserRole } from '../types.ts';

const AUTH_USER_KEY = 'jarvis-current-user-id';

const mockUsers: Record<string, User> = {
    'user-1': {
        id: 'user-1',
        name: 'Paolino Ferrer',
        email: 'paolino.ferrer@gmail.com',
        role: 'admin'
    },
    'user-2': {
        id: 'user-2',
        name: 'Mario Rossi',
        email: 'mario.rossi@tecnico.it',
        role: 'technician'
    }
};

export const getMockUsers = (): User[] => {
    return Object.values(mockUsers);
};

export const login = (userId: string): User | null => {
    console.log('AUTH: Logging in user', userId);
    const user = mockUsers[userId];
    if (user) {
        sessionStorage.setItem(AUTH_USER_KEY, user.id);
        return user;
    }
    return null;
};

export const logout = (): void => {
    console.log('AUTH: Logging out');
    sessionStorage.removeItem(AUTH_USER_KEY);
};

export const getCurrentUser = (): User | null => {
    const userId = sessionStorage.getItem(AUTH_USER_KEY);
    if (userId && mockUsers[userId]) {
        console.log('AUTH: Found current user', userId);
        return mockUsers[userId];
    }
    console.log('AUTH: No current user found');
    return null;
};