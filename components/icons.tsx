
import React from 'react';

export const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5.4-3a5.4 5.4 0 0 1-10.8 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-1.6z" />
  </svg>
);

export const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z" />
    </svg>
);

export const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 7z" />
  </svg>
);

export const PaperclipIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 6v11.5a4 4 0 1 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 1 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v11.5a5.5 5.5 0 0 0 11 0V6h-1.5z" />
  </svg>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z"/></svg>
);

export const BrainCircuitIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.5 2.3.93 2.87.71.09-.55.34-1.04.62-1.28-2.22-.25-4.55-1.11-4.55-4.92 0-1.1.39-1.99 1.03-2.69a3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.54 1.3.15 2.3.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85v2.75c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
    <path d="M12 11.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
    <path d="M12 4V2"/>
    <path d="M12 22v-2"/>
    <path d="M20 12h2"/>
    <path d="M2 12h2"/>
    <path d="M18.36 5.64l1.42-1.42"/>
    <path d="M4.22 19.78l1.42-1.42"/>
    <path d="M18.36 18.36l1.42 1.42"/>
    <path d="M4.22 4.22l1.42 1.42"/>
  </svg>
);

export const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v4H3V3zm0 5h18v13H3V8zm5 3v2h8v-2H8z"/>
    </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M24 9.5c3.23 0 5.45.98 7.2 2.6l5.5-5.5C33.07 3.47 29.04 2 24 2 14.5 2 6.53 7.85 3.53 16.37l6.63 5.12C11.53 14.38 17.2 9.5 24 9.5z"></path>
        <path fill="#34A853" d="M46.47 24.5c0-1.72-.15-3.37-.43-4.95H24v9.3h12.6c-.55 3-2.15 5.5-4.58 7.2l6.5 5C43.07 36.85 46.47 31.2 46.47 24.5z"></path>
        <path fill="#FBBC05" d="M10.16 21.48c-.5-1.5-.5-3.15 0-4.65l-6.63-5.12C1.65 14.85 0 19.25 0 24s1.65 9.15 3.53 12.28l6.63-5.12c-.5-1.5-.5-3.15 0-4.68z"></path>
        <path fill="#EA4335" d="M24 46c5.96 0 10.9-2.3 14.5-6.2l-6.5-5c-2.07 1.4-4.7 2.2-7.9 2.2-6.8 0-12.47-4.88-13.84-11.48l-6.63 5.12C6.53 40.15 14.5 46 24 46z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
);

export const DatabaseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zm0 6c-3.31 0-6-1.34-6-3s2.69-3 6-3 6 1.34 6 3-2.69 3-6 3z"/>
        <path d="M4 11v4c0 2.21 3.58 4 8 4s8-1.79 8-4v-4c-1.48.83-4.47 1.5-8 1.5s-6.52-.67-8-1.5z"/>
        <path d="M4 17v4c0 2.21 3.58 4 8 4s8-1.79 8-4v-4c-1.48.83-4.47 1.5-8 1.5s-6.52-.67-8-1.5z"/>
    </svg>
);
