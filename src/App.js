import React from 'react';
import AppRouter from './routes/AppRouter';
import UpdateReadyNotice from './components/Common/UpdateReadyNotice';
import { NewLookProvider } from './newlook/NewLookProvider';
import NewLookGate from './newlook/NewLookGate';
import UnitWordsLoader from './newlook/products/UnitWordsLoader';
import { BrandProvider } from './newlook/brand/BrandProvider';
import { ToastProvider } from './newlook/components';

function App() {
  return (
    <NewLookProvider>
      <UnitWordsLoader />
      <BrandProvider>
        <NewLookGate>
          <ToastProvider>
          <AppRouter />
        </ToastProvider>
        </NewLookGate>
      </BrandProvider>
      <UpdateReadyNotice />
    </NewLookProvider>
  );
}

export default App;
