import { createSlice } from '@reduxjs/toolkit';
import { humanizeMessage, humanizeTitle } from '../utils/friendlyError';

// Problems stay up longer than confirmations, so there is time to read them
const DEFAULT_DURATION = { success: 3500, info: 5000, warning: 7000, error: 8000 };

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    open: false,
    message: '',
    severity: 'info', // 'success', 'error', 'warning', 'info'
    title: null,
    duration: 6000,
  },
  reducers: {
    showNotification: (state, action) => {
      state.open = true;
      state.severity = action.payload.severity || 'info';
      // Last line of defence: problems are always shown in plain language, whoever raised them
      state.message =
        state.severity === 'error' || state.severity === 'warning'
          ? humanizeMessage(action.payload.message)
          : action.payload.message;
      state.title = humanizeTitle(action.payload.title);
      state.duration = action.payload.duration || DEFAULT_DURATION[state.severity] || 6000;
    },
    clearNotification: (state) => {
      state.open = false;
      state.message = '';
      state.title = null;
    },
  },
});

export const { showNotification, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer;

