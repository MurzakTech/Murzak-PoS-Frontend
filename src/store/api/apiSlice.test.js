import { axiosBaseQuery, apiSlice, initApiBridge } from './apiSlice';
import { invalidateQuery } from '../../newlook/hooks/useDataQuery';
import axiosInstance from '../../api/axiosInstance';

jest.mock('../../api/axiosInstance');

describe('RTK Query apiSlice & axiosBaseQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps successful responses from axiosInstance', async () => {
    axiosInstance.mockResolvedValueOnce({
      data: { message: { success: true, data: [{ item_code: 'P-1' }] } },
      status: 200,
    });

    const baseQuery = axiosBaseQuery();
    const result = await baseQuery({
      url: 'murzak_pos.api.products_list_api.list_products',
      method: 'GET',
    });

    expect(result.data).toEqual([{ item_code: 'P-1' }]);
    expect(axiosInstance).toHaveBeenCalledWith({
      url: 'murzak_pos.api.products_list_api.list_products',
      method: 'GET',
      data: undefined,
      params: undefined,
      headers: undefined,
      allowRefusal: false,
    });
  });

  it('handles server refusals ({ success: false }) as errors', async () => {
    axiosInstance.mockResolvedValueOnce({
      data: { message: { success: false, message: 'Stock not available' } },
      status: 200,
    });

    const baseQuery = axiosBaseQuery();
    const result = await baseQuery({
      url: 'murzak_pos.api.sales_api.create_pos_invoice',
      method: 'POST',
    });

    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(400);
    expect(result.error.message).toBe('Stock not available');
  });

  it('catches network errors from axiosInstance', async () => {
    const error = new Error('Connection timed out');
    error.response = { status: 504, data: { message: 'Gateway Timeout' } };
    axiosInstance.mockRejectedValueOnce(error);

    const baseQuery = axiosBaseQuery();
    const result = await baseQuery({
      url: 'murzak_pos.api.test',
      method: 'GET',
    });

    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(504);
    expect(result.error.message).toBe('Connection timed out');
  });

  it('dispatches RTK Query tag invalidations when NewLook bridge triggers', () => {
    const mockDispatch = jest.fn();
    initApiBridge(mockDispatch);

    invalidateQuery('products');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'api/invalidateTags',
        payload: expect.arrayContaining(['Product', 'Category']),
      })
    );

    mockDispatch.mockClear();
    invalidateQuery('customers');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'api/invalidateTags',
        payload: expect.arrayContaining(['Customer']),
      })
    );
  });
});
