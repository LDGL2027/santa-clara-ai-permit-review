import { getListSavedApplicationsQueryKey, useListSavedApplications } from '@workspace/api-client-react';
import { usePortalProfile } from '../PortalProfile';

export function useOwnedSavedApplications() {
  const profile = usePortalProfile();
  const records = useListSavedApplications({
    query: {
      queryKey: [...getListSavedApplicationsQueryKey(), profile.id],
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      staleTime: 15_000,
    },
  });
  const accountApplications = records.data?.filter(record =>
    record.applicantEmail.toLowerCase() === profile.email.toLowerCase())
    .sort((a, b) => Number(b.status === 'Submitted') - Number(a.status === 'Submitted') ||
      b.lastUpdated.localeCompare(a.lastUpdated));
  return {
    ...records,
    data: accountApplications,
    accountApplications,
  };
}