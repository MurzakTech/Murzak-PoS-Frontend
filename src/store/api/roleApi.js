import { apiSlice } from './apiSlice';

export const roleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.role_api.list_roles',
        params,
      }),
      providesTags: (result) =>
        result?.roles
          ? [
              ...result.roles.map(({ name }) => ({ type: 'Role', id: name })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
    }),

    getRoleDetails: builder.query({
      query: (roleName) => ({
        url: 'murzak_pos.api.role_api.get_role_details',
        params: { role_name: roleName },
      }),
      providesTags: (result, error, roleName) => [{ type: 'Role', id: roleName }],
    }),

    getRolePermissions: builder.query({
      query: (roleName) => ({
        url: 'murzak_pos.api.role_api.get_role_permissions',
        params: { role_name: roleName },
      }),
      providesTags: (result, error, roleName) => [{ type: 'Role', id: `perm-${roleName}` }],
    }),

    createRole: builder.mutation({
      query: (roleData) => ({
        url: 'murzak_pos.api.role_api.create_role',
        method: 'POST',
        data: roleData,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    updateRole: builder.mutation({
      query: (roleData) => ({
        url: 'murzak_pos.api.role_api.update_role',
        method: 'POST',
        data: roleData,
      }),
      invalidatesTags: (result, error, { role_name, name }) => [
        { type: 'Role', id: role_name || name },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    deleteRole: builder.mutation({
      query: (roleName) => ({
        url: 'murzak_pos.api.role_api.delete_role',
        method: 'POST',
        data: { role_name: roleName },
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleDetailsQuery,
  useGetRolePermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi;
