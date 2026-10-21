import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../newlook/components/EmptyState';
import S from '../newlook/strings';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 'var(--space-4)' }}>
      <EmptyState
        icon="search"
        title={S.notFound.title}
        description={S.notFound.text}
        action={{
          label: S.notFound.home,
          onClick: () => navigate('/'),
          icon: 'home',
        }}
      />
    </div>
  );
};

export default NotFound;
