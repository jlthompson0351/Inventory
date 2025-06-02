import { supabase } from '@/integrations/supabase/client';

interface InventorySession {
  id: string;
  assetId: string;
  assetName: string;
  formId: string;
  formData: Record<string, any>;
  status: 'draft' | 'completed';
  locations?: string[];
  startedAt: Date;
  lastUpdated: Date;
  userId?: string;
  organizationId: string;
}

const SESSION_STORAGE_KEY = 'inventory_sessions';
const CURRENT_SESSION_KEY = 'current_inventory_session';

/**
 * Get all inventory sessions from localStorage
 */
export function getAllSessions(): InventorySession[] {
  try {
    const sessionsJson = localStorage.getItem(SESSION_STORAGE_KEY);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

/**
 * Save all sessions to localStorage
 */
function saveAllSessions(sessions: InventorySession[]): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
}

/**
 * Create a new inventory session
 */
export function createSession(
  assetId: string,
  assetName: string,
  formId: string,
  organizationId: string,
  initialData: Record<string, any> = {}
): InventorySession {
  const session: InventorySession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    assetId,
    assetName,
    formId,
    formData: initialData,
    status: 'draft',
    startedAt: new Date(),
    lastUpdated: new Date(),
    organizationId,
    userId: undefined // Will be set when we get user info
  };
  
  // Get current user ID
  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) {
      session.userId = data.user.id;
      updateSession(session.id, { userId: data.user.id });
    }
  });
  
  const sessions = getAllSessions();
  sessions.push(session);
  saveAllSessions(sessions);
  
  // Set as current session
  localStorage.setItem(CURRENT_SESSION_KEY, session.id);
  
  return session;
}

/**
 * Get a specific session by ID
 */
export function getSession(sessionId: string): InventorySession | null {
  const sessions = getAllSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

/**
 * Get the current active session
 */
export function getCurrentSession(): InventorySession | null {
  const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!currentSessionId) return null;
  return getSession(currentSessionId);
}

/**
 * Update session data
 */
export function updateSession(sessionId: string, updates: Partial<InventorySession>): void {
  const sessions = getAllSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  
  if (index !== -1) {
    sessions[index] = {
      ...sessions[index],
      ...updates,
      lastUpdated: new Date()
    };
    saveAllSessions(sessions);
  }
}

/**
 * Update form data in the current session
 */
export function updateSessionFormData(formData: Record<string, any>): void {
  const currentSession = getCurrentSession();
  if (currentSession) {
    updateSession(currentSession.id, { formData });
  }
}

/**
 * Complete a session
 */
export function completeSession(sessionId: string): void {
  updateSession(sessionId, { status: 'completed' });
  
  // Clear current session if it matches
  const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
  if (currentSessionId === sessionId) {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): void {
  const sessions = getAllSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveAllSessions(filtered);
  
  // Clear current session if it matches
  const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
  if (currentSessionId === sessionId) {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

/**
 * Get sessions for a specific asset and form in the current month
 */
export function getSessionsForAssetForm(
  assetId: string, 
  formId: string,
  includeCompleted: boolean = false
): InventorySession[] {
  const sessions = getAllSessions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  return sessions.filter(s => {
    const sessionMonth = new Date(s.startedAt).toISOString().slice(0, 7);
    return s.assetId === assetId && 
           s.formId === formId && 
           sessionMonth === currentMonth &&
           (includeCompleted || s.status === 'draft');
  });
}

/**
 * Clean up old sessions (older than 30 days)
 */
export function cleanupOldSessions(): void {
  const sessions = getAllSessions();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeSessions = sessions.filter(s => {
    const sessionDate = new Date(s.lastUpdated);
    return sessionDate > thirtyDaysAgo || s.status === 'draft';
  });
  
  saveAllSessions(activeSessions);
}

/**
 * Check if there's an existing session for the asset/form combo
 */
export function hasExistingSession(assetId: string, formId: string): boolean {
  const sessions = getSessionsForAssetForm(assetId, formId, false);
  return sessions.length > 0;
}

/**
 * Get or create a session for an asset/form combo
 */
export function getOrCreateSession(
  assetId: string,
  assetName: string,
  formId: string,
  organizationId: string,
  initialData: Record<string, any> = {}
): InventorySession {
  // Check for existing draft session
  const existingSessions = getSessionsForAssetForm(assetId, formId, false);
  
  if (existingSessions.length > 0) {
    // Use the most recent session
    const mostRecent = existingSessions.sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )[0];
    
    // Set as current session
    localStorage.setItem(CURRENT_SESSION_KEY, mostRecent.id);
    return mostRecent;
  }
  
  // Create new session
  return createSession(assetId, assetName, formId, organizationId, initialData);
}

/**
 * Export session data for debugging or backup
 */
export function exportSessionData(sessionId: string): string {
  const session = getSession(sessionId);
  if (!session) return '';
  
  return JSON.stringify(session, null, 2);
}

// Run cleanup on module load
cleanupOldSessions(); 