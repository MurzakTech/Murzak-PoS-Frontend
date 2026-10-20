import { apiSlice } from './apiSlice';

export const staffApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaffList: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.staff_api.get_staff_users',
        params,
      }),
      providesTags: (result) =>
        result?.users
          ? [
              ...result.users.map(({ name }) => ({ type: 'Staff', id: name })),
              { type: 'Staff', id: 'LIST' },
            ]
          : [{ type: 'Staff', id: 'LIST' }],
    }),

    getStaffDetails: builder.query({
      query: (username) => ({
        url: 'murzak_pos.api.staff_api.get_staff_user_details',
        params: { username },
      }),
      providesTags: (result, error, username) => [{ type: 'Staff', id: username }],
    }),

    createStaffUser: builder.mutation({
      query: (userData) => ({
        url: 'murzak_pos.api.staff_api.create_staff_user',
        method: 'POST',
        data: userData,
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),

    updateStaffUser: builder.mutation({
      query: (userData) => ({
        url: 'murzak_pos.api.staff_api.update_staff_user',
        method: 'POST',
        data: userData,
      }),
      invalidatesTags: (result, error, { username, name }) => [
        { type: 'Staff', id: username || name },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    disableStaffUser: builder.mutation({
      query: (username) => ({
        url: 'murzak_pos.api.staff_api.disable_staff_user',
        method: 'POST',
        data: { username },
      }),
      invalidatesTags: (result, error, username) => [
        { type: 'Staff', id: username },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    enableStaffUser: builder.mutation({
      query: (username) => ({
        url: 'murzak_pos.api.staff_api.enable_staff_user',
        method: 'POST',
        data: { username },
      }),
      invalidatesTags: (result, error, username) => [
        { type: 'Staff', id: username },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    assignStaffRoles: builder.mutation({
      query: (data) => ({
        url: 'murzak_pos.api.staff_api.assign_roles_to_staff',
        method: 'POST',
        data,
      }),
      invalidatesTags: (result, error, { username }) => [
        { type: 'Staff', id: username },
        { type: 'Staff', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetStaffListQuery,
  useGetStaffDetailsQuery,
  useCreateStaffUserMutation,
  useUpdateStaffUserMutation,
  useDisableStaffUserMutation,
  useEnableStaffUserMutation,
  useAssignStaffRolesMutation,
} = staffApi;
