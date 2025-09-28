import { Report, DriveFile, KnowledgeSource, User } from '../types';
import * as drive from './googleDriveService';
import * as kb from './jarvisApi';
import * as auth from './authService';

// ====================================================================
// Questo file è il "Centralino" per tutti i dati dell'applicazione.
// Al momento, parla con i servizi "mock" che usano il localStorage.
// In futuro, per passare a un backend reale, modificheremo SOLO QUESTO FILE
// per fargli fare chiamate di rete (fetch) a un server,
// senza toccare il resto dell'applicazione.
// ====================================================================


// --- Autenticazione Utente App ---
export const login = auth.login;
export const logout = auth.logout;
export const getCurrentUser = auth.getCurrentUser;
export const getMockUsers = auth.getMockUsers;


// --- Autenticazione Google Drive ---
export const signInToDrive = drive.signIn;
export const signOutFromDrive = drive.signOut;
export const isDriveConnected = drive.isSignedIn;

// --- Gestione Report (attualmente su Google Drive mock) ---
export const listReports = drive.listReports;
export const loadReport = drive.loadReport;
export const saveReport = drive.saveReport;
export const deleteReport = drive.deleteReport;

// --- Gestione Base di Conoscenza (attualmente su localStorage) ---
export const listKnowledgeSources = kb.listSources;
export const addWebKnowledgeSource = (uri: string, title: string) => kb.addSource(uri, title);
export const addFileKnowledgeSource = kb.addFile;
export const deleteKnowledgeSource = kb.deleteSource;