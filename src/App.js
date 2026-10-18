import React from 'react';
import AppRouter from './routes/AppRouter';
import UpdateReadyNotice from './components/Common/UpdateReadyNotice';
import { NewLookProvider } from './newlook/NewLookProvider';

function App() {
  return (
    <NewLookProvider>
      <AppRouter />
      <UpdateReadyNotice />
    </NewLookProvider>
  );
}

export default App;
