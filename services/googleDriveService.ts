// FIX: Add declarations for gapi and google to resolve TypeScript errors
// about them not being defined. These are loaded from external scripts.
declare const gapi: any;
// FIX: Replaced 'declare const google: any' with a proper namespace declaration
// to allow TypeScript to resolve types like 'google.accounts.oauth2.TokenClient'
// and functions like 'google.accounts.oauth2.initTokenClient'.
declare namespace google {
    namespace accounts {
        namespace oauth2 {
            type TokenClient = any;
            type TokenResponse = any;

            function initTokenClient(config: any): TokenClient;
            function revoke(token: string, callback: () => void): void;
        }
    }
}

import { Report } from '../types.ts';

const getApiKey = () => {
    if (!process.env.GOOGLE_DRIVE_API_KEY) {
        throw new Error("GOOGLE_DRIVE_API_KEY environment variable not set. Please provide it to use Google Drive features.");
    }
    return process.env.GOOGLE_DRIVE_API_KEY;
};

const getClientId = () => {
    if (!process.env.GOOGLE_DRIVE_CLIENT_ID) {
        throw new Error("GOOGLE_DRIVE_CLIENT_ID environment variable not set. Please provide it to use Google Drive features.");
    }
    return process.env.GOOGLE_DRIVE_CLIENT_ID;
};

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Report Sicurezza Jarvis';
const FILE_EXTENSION = '.jarvis.report.json';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let driveFolderId: string | null = null;

/**
 * Funzione di callback chiamata al caricamento dello script GAPI.
 */
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

/**
 * Inizializza il client GAPI.
 */
async function initializeGapiClient() {
  try {
    await gapi.client.init({
      apiKey: getApiKey(),
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiInited = true;
  } catch(e) {
    console.error("Failed to initialize Google API Client", e);
    // Non bloccare l'app, ma le funzioni di Drive non funzioneranno.
  }
}

/**
 * Funzione di callback chiamata al caricamento dello script GIS.
 */
function gisLoaded() {
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: '', // Il callback viene gestito dalla promise nella funzione signIn
    });
    gisInited = true;
  } catch(e) {
    console.error("Failed to initialize Google Identity Services", e);
  }
}

// Carica gli script dinamicamente se non già presenti
if (typeof gapi === 'undefined') {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = gapiLoaded;
    document.body.appendChild(gapiScript);
} else {
    gapiLoaded();
}

if(typeof google === 'undefined'){
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = gisLoaded;
    document.body.appendChild(gisScript);
} else {
    gisLoaded();
}


export const isReady = () => gapiInited && gisInited;

/**
 * Esegue il login dell'utente e ottiene il token di accesso.
 */
export function signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!tokenClient || !gapiInited) {
            return reject(new Error('I servizi Google non sono pronti. Riprova tra poco.'));
        }

        const callback = (resp: google.accounts.oauth2.TokenResponse) => {
            if (resp.error) {
                return reject(resp);
            }
            gapi.client.setToken({ access_token: resp.access_token });
            resolve();
        };

        if (gapi.client.getToken() === null) {
            tokenClient.callback = callback;
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

/**
 * Esegue il logout dell'utente.
 */
export function signOut() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken(null);
    });
  }
}

/**
 * Cerca la cartella dell'app o la crea se non esiste.
 */
async function getOrCreateFolderId(): Promise<string> {
  if (driveFolderId) return driveFolderId;

  const response = await gapi.client.drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.result.files && response.result.files.length > 0) {
    driveFolderId = response.result.files[0].id!;
    return driveFolderId;
  }

  const folderMetadata = {
    name: FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const file = await gapi.client.drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });

  driveFolderId = file.result.id!;
  return driveFolderId;
}

/**
 * Salva un report su Google Drive. Può creare un nuovo file o aggiornarne uno esistente.
 */
export async function saveFile(report: Report, fileName: string, fileId: string | null): Promise<{id: string, name: string}> {
  if (!fileName.endsWith(FILE_EXTENSION)) {
      fileName += FILE_EXTENSION;
  }
  
  const folderId = await getOrCreateFolderId();
  const fileMetadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(fileId ? {} : { parents: [folderId] }), // Aggiungi il genitore solo se è un nuovo file
  };
  
  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(report, null, 2),
  };

  let response;
  if (fileId) {
    // Aggiorna file esistente
    response = await gapi.client.drive.files.update({
      fileId: fileId,
      resource: fileMetadata,
      media: media,
      fields: 'id, name',
    });
  } else {
    // Crea nuovo file
    response = await gapi.client.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name',
    });
  }
  
  return response.result;
}


/**
 * Elenca tutti i file di report salvati.
 */
export async function listFiles(): Promise<{ id: string; name: string }[]> {
  const folderId = await getOrCreateFolderId();
  const response = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and name contains '${FILE_EXTENSION}' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'modifiedTime desc',
  });

  return response.result.files?.map(f => ({ id: f.id!, name: f.name!.replace(FILE_EXTENSION, '') })) || [];
}

/**
 * Carica il contenuto di un file di report.
 */
export async function loadFile(fileId: string): Promise<Report> {
  const response = await gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });
  return JSON.parse(response.body);
}

/**
 * Elimina un file di report.
 */
export async function deleteFile(fileId: string): Promise<void> {
    await gapi.client.drive.files.delete({
        fileId: fileId,
    });
}