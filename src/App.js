import React from 'react';
import AppRouter from './routes/AppRouter';
import UpdateReadyNotice from './components/Common/UpdateReadyNotice';
import { NewLookProvider } from './newlook/NewLookProvider';
import NewLookGate from './newlook/NewLookGate';
import { BrandProvider } from './newlook/brand/BrandProvider';

function App() {
  return (
    <NewLookProvider>
      <BrandProvider>
        <NewLookGate>
          <AppRouter />
        </NewLookGate>
      </BrandProvider>
      <UpdateReadyNotice />
    </NewLookProvider>
  );
}

export default App;
