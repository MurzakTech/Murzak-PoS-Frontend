import React from 'react';
import AppRouter from './routes/AppRouter';
import UpdateReadyNotice from './components/Common/UpdateReadyNotice';
import { NewLookProvider } from './newlook/NewLookProvider';
import NewLookGate from './newlook/NewLookGate';

function App() {
  return (
    <NewLookProvider>
      <NewLookGate>
        <AppRouter />
      </NewLookGate>
      <UpdateReadyNotice />
    </NewLookProvider>
  );
}

export default App;
