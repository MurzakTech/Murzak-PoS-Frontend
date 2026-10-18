import axiosInstance from './axiosInstance';
import { addRoles, createPerson, deactivatePerson, listTeam, reactivatePerson, removeRoles, updatePerson } from './teamApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));

const ok = (message = {}) => ({ data: { message } });

beforeEach(() => jest.resetAllMocks());

describe('listTeam', () => {
  test('asks the new Team call and returns its data', async () => {
    axiosInstance.get.mockResolvedValue(ok({ success: true, data: { members: [], counts: { total: 0 }, tiers: {} } }));
    await expect(listTeam()).resolves.toEqual({ members: [], counts: { total: 0 }, tiers: {} });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.team_api.list_team', undefined);
    await listTeam({ company: 'Shop A', enabledOnly: true });
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.team_api.list_team', { params: { company: 'Shop A', enabled_only: 1 } });
  });

  test('a refusal or a network failure becomes a plain sentence', async () => {
    axiosInstance.get.mockResolvedValue(ok({ success: false, message: 'Only an owner or a manager can see the team.' }));
    await expect(listTeam()).rejects.toThrow('Only an owner or a manager can see the team.');
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listTeam()).rejects.toThrow(/could not reach|offline/i);
  });
});

describe('the staff calls the current Staff screen uses', () => {
  test('adding a person sends the same fields', async () => {
    axiosInstance.post.mockResolvedValue(ok({ staff_user: {} }));
    await createPerson({ firstName: 'Juma', lastName: 'Kamau', email: 'juma@shop-a.test', password: 'a-long-pass', phone: '', roles: ['Sales User'], company: 'Shop A' });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.staff_api.create_staff_user', {
      email: 'juma@shop-a.test',
      first_name: 'Juma',
      last_name: 'Kamau',
      password: 'a-long-pass',
      phone: undefined,
      roles: ['Sales User'],
      company: 'Shop A',
      enabled: true,
      send_welcome_email: false,
    });
  });

  test('a refusal that comes back as a normal reply is shown in words', async () => {
    axiosInstance.post.mockResolvedValue(ok({ success: false, code: 'EMAIL_EXISTS', message: 'A staff member with this email address already exists.' }));
    await expect(createPerson({ firstName: 'A', lastName: 'B', email: 'a@b.test', password: 'x', roles: [] })).rejects.toThrow('already exists');
  });

  test('changing a person is a PUT with their email', async () => {
    axiosInstance.put.mockResolvedValue(ok({ staff_user: {} }));
    await updatePerson({ email: 'juma@shop-a.test', firstName: 'Juma', lastName: 'Kamau', phone: '0712345678' });
    expect(axiosInstance.put).toHaveBeenCalledWith('murzak_pos.api.staff_api.update_staff_user', { user_email: 'juma@shop-a.test', first_name: 'Juma', last_name: 'Kamau', phone: '0712345678' });
  });

  test('roles are added without replacing the ones a person has, and removed by name', async () => {
    axiosInstance.post.mockResolvedValue(ok({}));
    await addRoles({ email: 'a@b.test', roles: ['Sales Manager'] });
    expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.staff_api.assign_roles_to_staff', { user_email: 'a@b.test', roles: ['Sales Manager'], replace_existing: false });
    await removeRoles({ email: 'a@b.test', roles: ['System Manager'] });
    expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.staff_api.remove_roles_from_staff', { user_email: 'a@b.test', roles: ['System Manager'] });
  });

  test('deactivating and reactivating name the person', async () => {
    axiosInstance.post.mockResolvedValue(ok({ message: 'ok' }));
    await deactivatePerson('a@b.test');
    expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.staff_api.disable_staff_user', { user_email: 'a@b.test' });
    await reactivatePerson('a@b.test');
    expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.staff_api.enable_staff_user', { user_email: 'a@b.test' });
  });

  test('a refusal from the server (only an owner may do this) keeps its sentence', async () => {
    const error = new Error('x');
    error.isAxiosError = true;
    error.response = { status: 403, data: { exception: 'frappe.exceptions.PermissionError: Only a business owner or System Manager can do this.' } };
    axiosInstance.post.mockRejectedValue(error);
    await expect(deactivatePerson('a@b.test')).rejects.toThrow('Only a business owner or System Manager can do this.');
  });
});
