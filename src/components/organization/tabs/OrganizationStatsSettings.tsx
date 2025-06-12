import React from 'react';
import SystemStats from '@/components/system-admin/SystemStats';

const OrganizationStatsSettings = () => {
  // Use default stats for now - in a real implementation, you'd fetch actual organization stats
  const defaultStats = {
    organizationsCount: 1,
    usersCount: 0,
    assetsCount: 0,
    formsCount: 0
  };

  return <SystemStats initialStats={defaultStats} />;
};

export default OrganizationStatsSettings; 