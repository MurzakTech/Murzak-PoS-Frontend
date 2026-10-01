import { createSlice } from '@reduxjs/toolkit';

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
      state.message = action.payload.message;
      state.severity = action.payload.severity || 'info';
      state.title = action.payload.title || null;
      state.duration = action.payload.duration || 6000;
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

