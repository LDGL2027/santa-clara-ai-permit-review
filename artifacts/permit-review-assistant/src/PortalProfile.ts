import { createContext, useContext } from 'react';
import type { PortalUser } from '@workspace/api-client-react';

// Keep context identity outside component modules so Fast Refresh never replaces
// the provider and consumer with different instances.
export const ProfileContext = createContext<PortalUser | null>(null);
export const PortalSessionContext = createContext<{ leavePortal: () => Promise<void>; busy: boolean } | null>(null);
export function usePortalSession() {
  const session = useContext(PortalSessionContext);
  if (!session) throw new Error('A portal session provider is required.');
  return session;
}

export function usePortalProfile() {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error('A selected portal profile is required.');
  return profile;
}