import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Stack,
} from '@mui/material';
import { ArrowBack, Add, Edit, Delete, Category as CategoryIcon, AccountTree as AccountTreeIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createItemGroup,
  getItemGroups,
  updateItemGroup,
  deleteItemGroup,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

const Categories = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { itemGroups, isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      item_group_name: '',
      parent_item_group: '',
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch item groups on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getItemGroups({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  const handleCreateOpen = () => {
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    resetCreate();
  };

  const handleEditOpen = (category) => {
    resetEdit({
      name: category.name,
      item_group_name: category.item_group_name || category.name,
      parent_item_group: category.parent_item_group || '',
    });
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedCategory(null);
    resetEdit();
  };

  const handleDeleteOpen = (category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const onCreateSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const groupData = {
      company: userCompany,
      item_group_name: data.item_group_name,
      parent_item_group: data.parent_item_group || null,
    };

    const result = await dispatch(createItemGroup(groupData));

    if (result.type === 'product/createItemGroup/fulfilled') {
      handleCreateClose();
      dispatch(getItemGroups({ company: userCompany }));
    }
  };

  const onEditSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const groupData = {
      company: userCompany,
      name: data.name,
      item_group_name: data.item_group_name,
      parent_item_group: data.parent_item_group || null,
    };

    const result = await dispatch(updateItemGroup(groupData));

    if (result.type === 'product/updateItemGroup/fulfilled') {
      handleEditClose();
      dispatch(getItemGroups({ company: userCompany }));
    }
  };

  const onDeleteConfirm = async () => {
    if (!userCompany || !selectedCategory) return;

    const result = await dispatch(deleteItemGroup({
      name: selectedCategory.name,
      company: userCompany,
    }));

    if (result.type === 'product/deleteItemGroup/fulfilled') {
      handleDeleteClose();
      dispatch(getItemGroups({ company: userCompany }));
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/products')}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              Categories Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateOpen}
          >
            Create Category
          </Button>
        </Box>

        {/* Categories Table */}
        <Paper elevation={2}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : itemGroups.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No categories found. Create one to get started.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category Name</TableCell>
                    <TableCell>Parent Category</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemGroups.map((category) => (
                    <TableRow key={category.name}>
                      <TableCell>{category.item_group_name || category.name}</TableCell>
                      <TableCell>{category.parent_item_group || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditOpen(category)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteOpen(category)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle>Create Category</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="item_group_name"
                  control={createControl}
                  rules={{ required: 'Category name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Category Name"
                      fullWidth
                      size="small"
                      required
                      error={!!createErrors.item_group_name}
                      helperText={createErrors.item_group_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CategoryIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
                <Controller
                  name="parent_item_group"
                  control={createControl}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Parent Category (Optional)</InputLabel>
                      <Select
                        {...field}
                        label="Parent Category (Optional)"
                      >
                        <MenuItem value="">None</MenuItem>
                        {itemGroups.map((group) => (
                          <MenuItem key={group.name} value={group.item_group_name || group.name}>
                            {group.item_group_name || group.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? <CircularProgress size={18} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="item_group_name"
                  control={editControl}
                  rules={{ required: 'Category name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Category Name"
                      fullWidth
                      size="small"
                      required
                      error={!!editErrors.item_group_name}
                      helperText={editErrors.item_group_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CategoryIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
                <Controller
                  name="parent_item_group"
                  control={editControl}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Parent Category (Optional)</InputLabel>
                      <Select
                        {...field}
                        label="Parent Category (Optional)"
                      >
                        <MenuItem value="">None</MenuItem>
                        {itemGroups
                          .filter((g) => g.name !== selectedCategory?.name)
                          .map((group) => (
                            <MenuItem key={group.name} value={group.item_group_name || group.name}>
                              {group.item_group_name || group.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? <CircularProgress size={18} /> : 'Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={handleDeleteClose}
          onConfirm={onDeleteConfirm}
          title="Delete Category"
          message={
            <>
              Are you sure you want to delete <strong>"{selectedCategory?.item_group_name || selectedCategory?.name}"</strong>?
              <br />
              <br />
              This action cannot be undone. Make sure this category is not being used by any products.
            </>
          }
          variant="error"
          confirmText="Delete"
          cancelText="Cancel"
          loading={isLoading}
        />
      </Box>
    </Container>
  );
};

export default Categories;
