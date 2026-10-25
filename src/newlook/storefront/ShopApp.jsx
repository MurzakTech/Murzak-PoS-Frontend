import React from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import CataloguePage from './CataloguePage';
import CheckoutPage from './CheckoutPage';
import { ShopProvider } from './ShopProvider';

const CHECKOUT_PATH = 'checkout';

/** Everything under /shop/<name>: the shop's front page and its checkout, sharing one shop and one basket. */
const ShopApp = () => {
  const { slug } = useParams();
  const name = String(slug || '').toLowerCase();
  return (
    // A different shop starts fresh: its own basket, its own language state
    <ShopProvider key={name} slug={name}>
      <Routes>
        <Route index element={<CataloguePage />} />
        <Route path={CHECKOUT_PATH} element={<CheckoutPage />} />
        <Route path="*" element={<Navigate to={`/shop/${name}`} replace />} />
      </Routes>
    </ShopProvider>
  );
};

export default ShopApp;
