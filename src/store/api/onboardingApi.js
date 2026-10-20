import { apiSlice } from './apiSlice';

export const onboardingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSetupState: builder.query({
      query: (company) => ({
        url: 'murzak_pos.api.setup_api.get_setup_state',
        params: company ? { company } : undefined,
      }),
      providesTags: ['Setup'],
    }),

    saveSetupProgress: builder.mutation({
      query: ({ step, skipped = false, company }) => ({
        url: 'murzak_pos.api.setup_api.save_setup_progress',
        method: 'POST',
        data: {
          step,
          ...(skipped ? { skipped: 1 } : {}),
          ...(company ? { company } : {}),
        },
        allowRefusal: true,
      }),
      invalidatesTags: ['Setup'],
    }),

    saveBusinessKind: builder.mutation({
      query: ({ kind, company }) => ({
        url: 'murzak_pos.api.setup_api.save_business_kind',
        method: 'POST',
        data: {
          kind,
          ...(company ? { company } : {}),
        },
        allowRefusal: true,
      }),
      invalidatesTags: ['Setup', 'Product', 'Stock'],
    }),

    saveTaxId: builder.mutation({
      query: ({ company, taxId }) => ({
        url: 'murzak_pos.api.onboarding_api.update_company',
        method: 'POST',
        data: {
          company_name: company,
          tax_id: taxId,
        },
        allowRefusal: true,
      }),
      invalidatesTags: ['Setup', 'Onboarding'],
    }),

    saveOpeningCash: builder.mutation({
      query: ({ amount, company }) => ({
        url: 'murzak_pos.api.setup_api.save_opening_cash',
        method: 'POST',
        data: {
          amount: amount === null || amount === undefined ? '' : amount,
          ...(company ? { company } : {}),
        },
        allowRefusal: true,
      }),
      invalidatesTags: ['Setup', 'Sale'],
    }),

    createCompany: builder.mutation({
      query: (companyData) => ({
        url: 'murzak_pos.api.onboarding_api.create_company',
        method: 'POST',
        data: companyData,
      }),
      invalidatesTags: ['Onboarding', 'Setup', 'Warehouse'],
    }),

    createPOSProfile: builder.mutation({
      query: (posProfileData) => ({
        url: 'murzak_pos.api.onboarding_api.create_pos_profile',
        method: 'POST',
        data: posProfileData,
      }),
      invalidatesTags: ['Onboarding', 'Setup'],
    }),

    createETIMSSettings: builder.mutation({
      query: (etimsData) => ({
        url: 'murzak_pos.api.onboarding_api.create_etims_settings',
        method: 'POST',
        data: etimsData,
      }),
      invalidatesTags: ['Onboarding', 'Setup'],
    }),

    checkAbbreviation: builder.query({
      query: (abbr) => ({
        url: 'murzak_pos.api.onboarding_api.check_abbreviation_exists',
        params: { abbr },
      }),
    }),
  }),
});

export const {
  useGetSetupStateQuery,
  useSaveSetupProgressMutation,
  useSaveBusinessKindMutation,
  useSaveTaxIdMutation,
  useSaveOpeningCashMutation,
  useCreateCompanyMutation,
  useCreatePOSProfileMutation,
  useCreateETIMSSettingsMutation,
  useCheckAbbreviationQuery,
  useLazyCheckAbbreviationQuery,
} = onboardingApi;
