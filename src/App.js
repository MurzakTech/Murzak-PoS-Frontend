import React from 'react';
import AppRouter from './routes/AppRouter';
import IdleSignOut from './components/Auth/IdleSignOut';
import UpdateReadyNotice from './components/Common/UpdateReadyNotice';

function App() {
  return (
    <>
      <AppRouter />
      <IdleSignOut />
      <UpdateReadyNotice />
    </>
  );
}

export default App;
