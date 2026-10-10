import React from 'react';
import AppRouter from './routes/AppRouter';
import UpdateReadyNotice from './components/Common/UpdateReadyNotice';

function App() {
  return (
    <>
      <AppRouter />
      <UpdateReadyNotice />
    </>
  );
}

export default App;
