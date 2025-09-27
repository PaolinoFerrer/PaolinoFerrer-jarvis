
declare const gapi: any;
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
let driveFolderId: string | null = null;
let initPromise: Promise<void> | null = null;

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error(`Failed to load script ${src}: ${JSON.stringify(err)}`));
    document.head.appendChild(script);
  });
};

const initialize = (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await loadScript('https://apis.google.com/js/api.js');
      await loadScript('https://accounts.google.com/gsi/client');

      await new Promise<void>((resolve) => gapi.load('client', resolve));

      await gapi.client.init({
        apiKey: getApiKey(),
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: getClientId(),
        scope: SCOPES,
        callback: '',
      });
    } catch (err) {
      console.error('Google API initialization failed:', err);
      initPromise = null; // Reset promise on failure to allow retry
      throw new Error('Impossibile inizializzare i servizi di Google. Controlla la tua connessione e le estensioni del browser (es. ad-blocker).');
    }
  })();

  return initPromise;
};

export async function signIn(): Promise<void> {
  await initialize();
  if (!tokenClient) {
    throw new Error('Il client di autenticazione Google non è pronto.');
  }

  return new Promise((resolve, reject) => {
    const callback = (resp: google.accounts.oauth2.TokenResponse) => {
      if (resp.error) {
        console.error('Google Sign-In Error:', resp);
        const errorMessage = `Accesso fallito. Dettagli: ${resp.error_description || resp.error}`;
        return reject(new Error(errorMessage));
      }
      gapi.client.setToken({ access_token: resp.access_token });
      resolve();
    };
    tokenClient.callback = callback;
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export async function signOut() {
  await initialize();
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken(null);
    });
  }
}

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

  const file = await gapi.client.drive.files.create({
    resource: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  driveFolderId = file.result.id!;
  return driveFolderId;
}

export async function saveFile(report: Report, fileName: string, fileId: string | null): Promise<{ id: string; name: string }> {
  await initialize();
  if (!fileName.endsWith(FILE_EXTENSION)) {
    fileName += FILE_EXTENSION;
  }

  const folderId = await getOrCreateFolderId();
  const fileMetadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(fileId ? {} : { parents: [folderId] }),
  };

  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(report, null, 2),
  };

  const response = fileId
    ? await gapi.client.drive.files.update({
        fileId: fileId,
        resource: fileMetadata,
        media: media,
        fields: 'id, name',
      })
    : await gapi.client.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name',
      });

  return response.result;
}

export async function listFiles(): Promise<{ id: string; name: string }[]> {
  await initialize();
  const folderId = await getOrCreateFolderId();
  const response = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and name contains '${FILE_EXTENSION}' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'modifiedTime desc',
  });

  return response.result.files?.map(f => ({ id: f.id!, name: f.name!.replace(FILE_EXTENSION, '') })) || [];
}

export async function loadFile(fileId: string): Promise<Report> {
  await initialize();
  const response = await gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });
  return JSON.parse(response.body);
}

export async function deleteFile(fileId: string): Promise<void> {
  await initialize();
  await gapi.client.drive.files.delete({
    fileId: fileId,
  });
}
