import { Report, DriveFile } from '../types.ts';
import { db } from './firebase.ts';
import firebase from 'firebase/app';


const REPORTS_COLLECTION = 'reports';
const AUTH_STORAGE_KEY = 'jarvis-gdrive-loggedin'; // Kept for UI mock purposes

export const listReports = async (): Promise<DriveFile[]> => {
    console.log("FIRESTORE: Listing reports");
    const q = db.collection(REPORTS_COLLECTION).orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    const files: DriveFile[] = [];
    querySnapshot.forEach(doc => {
        files.push({ id: doc.id, name: doc.data().name });
    });
    return files;
};

export const loadReport = async (fileId: string): Promise<Report> => {
    console.log("FIRESTORE: Loading report", fileId);
    const docRef = db.collection(REPORTS_COLLECTION).doc(fileId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        return docSnap.data()!.content as Report;
    } else {
        throw new Error("Report not found in Firestore.");
    }
};

export const saveReport = async (report: Report): Promise<DriveFile> => {
    console.log("FIRESTORE: Saving report");
    const workplaceName = report[0]?.name || 'SenzaNome';
    const newName = `DVR ${workplaceName} - ${new Date().toLocaleDateString('it-IT')}.json`;
    
    const docRef = await db.collection(REPORTS_COLLECTION).add({
        name: newName,
        content: report,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return { id: docRef.id, name: newName };
};

export const deleteReport = async (fileId: string): Promise<void> => {
    console.log("FIRESTORE: Deleting report", fileId);
    await db.collection(REPORTS_COLLECTION).doc(fileId).delete();
};

// --- Mock Authentication (Kept for UI compatibility) ---

export const signIn = async (): Promise<void> => {
    console.log("DRIVE MOCK: Signing in");
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    return Promise.resolve();
};

export const signOut = async (): Promise<void> => {
    console.log("DRIVE MOCK: Signing out");
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return Promise.resolve();
};

export const isSignedIn = (): boolean => {
    const signedIn = localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    console.log("DRIVE MOCK: Check signed in status:", signedIn);
    return signedIn;
};
