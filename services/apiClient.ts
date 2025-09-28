// Fix: This file was not a module. It has been implemented as a facade to aggregate various service modules.
// This resolves the import error in App.tsx and provides a single point of access to client-side services.

// Auth exports from './authService'
export { getMockUsers, login, logout, getCurrentUser } from './authService';

// Google Drive exports from './googleDriveService'
// Renaming exports to match their usage in App.tsx
export { 
    listReports, 
    loadReport, 
    saveReport, 
    deleteReport,
    signIn as signInToDrive,
    signOut as signOutFromDrive,
    isSignedIn as isDriveConnected
} from './googleDriveService';

// Knowledge Base exports from './backendService'
export {
    listKnowledgeSources,
    addWebKnowledgeSource,
    addFileKnowledgeSource,
    deleteKnowledgeSource
} from './backendService';
