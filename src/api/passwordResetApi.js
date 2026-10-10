import axiosInstance from './axiosInstance';

// Relative to the API address, which already ends in /api/method
const BASE = 'techsavanna_pos.api.password_reset';

const result = (response) => response.data?.message || {};

/** Emails a 6-digit reset code to the account that matches the email or phone number. */
export const requestPasswordReset = async (identifier) =>
  result(await axiosInstance.post(`${BASE}.request_password_reset`, { identifier }));

/** Checks the code and sets the new password. */
export const resetPasswordWithCode = async ({ identifier, code, newPassword }) =>
  result(await axiosInstance.post(`${BASE}.reset_password_with_code`, { identifier, code, new_password: newPassword }));
