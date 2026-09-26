import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App only once
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable local persistence so Firebase remembers the user across browser sessions & reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set Firebase auth persistence:', err);
});

const provider = new GoogleAuthProvider();
// Required Workspace scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

SCOPES.forEach((scope) => provider.addScope(scope));

// Use select_account so the user does NOT get forced to re-consent on every single visit
provider.setCustomParameters({
  prompt: 'select_account',
});

// Storage keys for persisting Google OAuth access token across page refreshes
const STORAGE_TOKEN_KEY = 'savings_google_access_token';
const STORAGE_EXPIRY_KEY = 'savings_google_token_expiry';

// In-memory cache + persistent storage fallback
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Helper to retrieve token (checks memory first, then localStorage with expiration check)
export const getStoredAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;

  try {
    const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
    const expiryStr = localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (stored && expiryStr) {
      const expiry = Number(expiryStr);
      // Valid if still has at least 1 minute remaining
      if (Date.now() < expiry - 60000) {
        cachedAccessToken = stored;
        return stored;
      }
    }
  } catch (e) {
    console.warn('Could not read access token from storage:', e);
  }
  return null;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
      // Google OAuth access tokens are valid for 1 hour (3600s)
      localStorage.setItem(STORAGE_EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
    } catch {}
  }
};

export const clearStoredAccessToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  } catch {}
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getStoredAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        // User is known in Firebase, but we need fresh Google Sheets token
        clearStoredAccessToken();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearStoredAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }

    setAccessTokenInMemory(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getStoredAccessToken();
};

export const logout = async () => {
  await signOut(auth);
  clearStoredAccessToken();
};
