import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle,
  Lock,
  Logout,
  Edit,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout, updateUserProfile, changePassword } from '../../store/authSlice';
import { useForm } from 'react-hook-form';

const UserMenu = ({ anchorEl, open, onClose }) => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm();

  // Update form when user changes or dialog opens
  React.useEffect(() => {
    if (profileDialogOpen && user) {
      resetProfile({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone: user?.mobile_no || '',
      });
    }
  }, [profileDialogOpen, user, resetProfile]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPassword,
  } = useForm();

  const password = watch('new_password');

  const handleProfileUpdate = async (data) => {
    setIsUpdating(true);
    const result = await dispatch(updateUserProfile(data));
    setIsUpdating(false);
    
    if (updateUserProfile.fulfilled.match(result)) {
      setProfileDialogOpen(false);
      resetProfile();
      onClose();
    }
  };

  const handlePasswordChange = async (data) => {
    setIsUpdating(true);
    const result = await dispatch(changePassword({
      old_password: data.old_password,
      new_password: data.new_password,
    }));
    setIsUpdating(false);
    
    if (changePassword.fulfilled.match(result)) {
      setPasswordDialogOpen(false);
      resetPassword();
      onClose();
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    onClose();
  };

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
    onClose();
  };

  const handlePasswordClick = () => {
    setPasswordDialogOpen(true);
    onClose();
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.full_name || user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePasswordClick}>
          <ListItemIcon>
            <Lock fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Password</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Update Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => !isUpdating && setProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Profile</DialogTitle>
        <form onSubmit={handleProfileSubmit(handleProfileUpdate)}>
          <DialogContent>
            <TextField
              fullWidth
              label="First Name"
              margin="normal"
              {...registerProfile('first_name', {
                required: 'First name is required',
                minLength: { value: 2, message: 'Must be at least 2 characters' },
              })}
              error={!!profileErrors.first_name}
              helperText={profileErrors.first_name?.message}
              disabled={isUpdating}
            />
            <TextField
              fullWidth
              label="Last Name"
              margin="normal"
              {...registerProfile('last_name', {
                required: 'Last name is required',
                minLength: { value: 2, message: 'Must be at least 2 characters' },
              })}
              error={!!profileErrors.last_name}
              helperText={profileErrors.last_name?.message}
              disabled={isUpdating}
            />
            <TextField
              fullWidth
              label="Phone Number"
              margin="normal"
              type="tel"
              {...registerProfile('phone', {
                pattern: {
                  value: /^\+?[1-9]\d{1,14}$/,
                  message: 'Invalid phone number format',
                },
              })}
              error={!!profileErrors.phone}
              helperText={profileErrors.phone?.message}
              disabled={isUpdating}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isUpdating}>
              {isUpdating ? <CircularProgress size={24} /> : 'Update'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => !isUpdating && setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit(handlePasswordChange)}>
          <DialogContent>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              margin="normal"
              {...registerPassword('old_password', {
                required: 'Current password is required',
              })}
              error={!!passwordErrors.old_password}
              helperText={passwordErrors.old_password?.message}
              disabled={isUpdating}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              margin="normal"
              {...registerPassword('new_password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' },
              })}
              error={!!passwordErrors.new_password}
              helperText={passwordErrors.new_password?.message}
              disabled={isUpdating}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              margin="normal"
              {...registerPassword('confirm_password', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
              error={!!passwordErrors.confirm_password}
              helperText={passwordErrors.confirm_password?.message}
              disabled={isUpdating}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isUpdating}>
              {isUpdating ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default UserMenu;

