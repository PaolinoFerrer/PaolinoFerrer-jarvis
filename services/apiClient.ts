import * as authService from './authService.ts';
import * as driveService from './googleDriveService.ts';
import * as backendService from './backendService.ts';
import * as geminiService from './geminiService.ts';

// This file acts as a single point of contact (a facade) for the UI components.
// It delegates calls to the appropriate services. This makes it much easier
// to switch out implementations later (e.g., from a mock backend to a real one)
// without changing any of the UI code.

// --- Auth ---
export const { getMockUsers, login, logout, getCurrentUser } = authService;

// --- Google Drive ---
export const { 
    signIn: signInToDrive, 
    signOut: signOutFromDrive, 
    isSignedIn: isDriveSignedIn,
    listReports,
    loadReport,
    saveReport,
    deleteReport,
} = driveService;

// --- Knowledge Base (from Backend) ---
export const {
    listKnowledgeSources,
    addWebKnowledgeSource,
    addFileKnowledgeSource,
    deleteKnowledgeSource,
    searchKnowledgeBase, // Export the new RAG search function
} = backendService;

// --- Gemini AI ---
export const { generateResponse, findWebSources } = geminiService;