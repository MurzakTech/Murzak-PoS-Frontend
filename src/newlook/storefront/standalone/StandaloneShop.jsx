import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import ShopApp from '../ShopApp';
import TrackPage from '../TrackPage';
import useLanguage from '../useLanguage';

const SHOP_PATH = '/shop/:slug/*';
const TRACK_PATH = '/track/:token';

/** This container serves one shop. A link to any other shop's name comes back to this one. */
const OnlyThisShop = ({ slug }) => {
  const { slug: asked } = useParams();
  if (String(asked || '').toLowerCase() !== slug) return <Navigate to={`/shop/${slug}`} replace />;
  return <ShopApp />;
};

/** Shown when the container has no valid shop name: a setup fault, not something a shopper can fix. */
const NotSetUp = () => {
  const { t } = useLanguage();
  return <EmptyState icon="store" title={t('closedTitle')} description={t('closedBody')} />;
};

/** The whole site of one shop: its store front, checkout and order tracking, and nothing else. */
const StandaloneShop = ({ slug }) => {
  if (!slug) return <NotSetUp />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path={SHOP_PATH} element={<OnlyThisShop slug={slug} />} />
        <Route path={TRACK_PATH} element={<TrackPage />} />
        <Route path="*" element={<Navigate to={`/shop/${slug}`} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default StandaloneShop;
