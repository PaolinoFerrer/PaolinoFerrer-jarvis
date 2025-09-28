import { Report, DriveFile } from '../types';

const DRIVE_STORAGE_KEY = 'jarvis-google-drive-mock';
const AUTH_STORAGE_KEY = 'jarvis-gdrive-loggedin';

interface MockDriveFile {
    id: string;
    name: string;
    content: Report;
    createdAt: string;
}

// Fix: Replaced placeholder content with a full mock implementation for Google Drive services.
// Ensure we have some initial data for demonstration if storage is empty
const getInitialMockData = (): Record<string, MockDriveFile> => ({
    'mock-id-1': {
        id: 'mock-id-1',
        name: `report-sicurezza-jarvis-${Date.now() - 86400000}.json`,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        content: [
            {
                id: "workplace-initial-1",
                name: "Magazzino Esempio",
                tasks: [
                    {
                        id: "task-initial-1",
                        name: "Carrellista",
                        findings: [{
                            id: "finding-initial-1",
                            description: "Pavimentazione sconnessa.",
                            hazard: "Rischio di inciampo e ribaltamento muletto",
                            damage: 3,
                            probability: 2,
                            exposure: 3,
                            riskLevel: 6, // 3*2*3=18, maps to 6
                            regulation: "D.Lgs. 81/08",
                            recommendation: "Ripristinare la pavimentazione."
                        }],
                        requiredDpi: [{ name: "Scarpe antinfortunistiche" }]
                    }
                ]
            }
        ]
    }
});

const getMockDrive = (): Record<string, MockDriveFile> => {
    try {
        const stored = localStorage.getItem(DRIVE_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // If nothing is stored, initialize with sample data
        const initialData = getInitialMockData();
        localStorage.setItem(DRIVE_STORAGE_KEY, JSON.stringify(initialData));
        return initialData;
    } catch (error) {
        console.error("Failed to load mock drive from localStorage", error);
        return getInitialMockData();
    }
};

const saveMockDrive = (drive: Record<string, MockDriveFile>) => {
    try {
        localStorage.setItem(DRIVE_STORAGE_KEY, JSON.stringify(drive));
    } catch (error) {
        console.error("Failed to save mock drive to localStorage", error);
    }
};

export const listReports = async (): Promise<DriveFile[]> => {
    console.log("DRIVE: Listing reports");
    const drive = getMockDrive();
    const files = Object.values(drive)
        .map(({ id, name }) => ({ id, name }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Sort descending by name (newest first)
    return Promise.resolve(files);
};

export const loadReport = async (fileId: string): Promise<Report> => {
    console.log("DRIVE: Loading report", fileId);
    const drive = getMockDrive();
    if (drive[fileId]) {
        return Promise.resolve(drive[fileId].content);
    }
    throw new Error("Report not found in mock Drive.");
};

export const saveReport = async (report: Report): Promise<DriveFile> => {
    console.log("DRIVE: Saving report");
    const drive = getMockDrive();
    const newId = `mock-id-${Date.now()}`;
    const newName = `report-sicurezza-jarvis-${Date.now()}.json`;
    drive[newId] = {
        id: newId,
        name: newName,
        content: report,
        createdAt: new Date().toISOString()
    };
    saveMockDrive(drive);
    return Promise.resolve({ id: newId, name: newName });
};

export const deleteReport = async (fileId: string): Promise<void> => {
    console.log("DRIVE: Deleting report", fileId);
    const drive = getMockDrive();
    if (drive[fileId]) {
        delete drive[fileId];
        saveMockDrive(drive);
        return Promise.resolve();
    }
    throw new Error("Report to delete not found in mock Drive.");
};

// --- Mock Authentication ---

export const signIn = async (): Promise<void> => {
    console.log("DRIVE: Signing in");
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    return Promise.resolve();
};

export const signOut = async (): Promise<void> => {
    console.log("DRIVE: Signing out");
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return Promise.resolve();
};

export const isSignedIn = (): boolean => {
    const signedIn = localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    console.log("DRIVE: Check signed in status:", signedIn);
    return signedIn;
};