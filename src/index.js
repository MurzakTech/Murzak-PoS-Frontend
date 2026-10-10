import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './theme/ThemeProvider';
import NotificationProvider from './components/Notification/NotificationProvider';
import { store } from './store/store';
import { checkAuth, fetchCurrentUser } from './store/authSlice';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { UPDATE_READY_EVENT } from './components/Common/UpdateReadyNotice';

// Component to initialize auth and onboarding state on app load
const AuthInitializer = ({ children }) => {
  useEffect(() => {
    // Check authentication status on app load
    store.dispatch(checkAuth());
    
    // Fetch fresh user profile if authenticated (includes company info)
    const token = localStorage.getItem('access_token');
    if (token) {
      store.dispatch(fetchCurrentUser());
    }
    
    // Initialize onboarding state from localStorage
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    const companyStr = localStorage.getItem('company');
    if (onboardingCompleted && companyStr) {
      try {
        const company = JSON.parse(companyStr);
        // Update onboarding state if needed
        // The slice already reads from localStorage in getInitialState
      } catch (error) {
        console.error('Error parsing company from localStorage:', error);
      }
    }
  }, []);

  return children;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
    <Provider store={store}>
      <ThemeProvider>
        <NotificationProvider>
          <AuthInitializer>
            <App />
          </AuthInitializer>
        </NotificationProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

// Keep the app on the device so it opens without internet (see src/service-worker.js).
// A version that arrives mid-shift is announced, never forced, so a sale is not lost.
serviceWorkerRegistration.register({
  onUpdate: (apply) => window.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT, { detail: { apply } })),
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
