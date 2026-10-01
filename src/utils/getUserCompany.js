/**
 * Utility function to get company name from multiple sources
 * This ensures company is available even if Redux state hasn't updated yet
 * 
 * @param {Object} user - User object from Redux state
 * @returns {string|null} Company name or null if not found
 */
export function getUserCompany(user) {
  // Try Redux state first (most up-to-date)
  if (user?.company) return user.company;
  if (user?.custom_company) return user.custom_company;
  if (user?.company_name) return user.company_name;
  if (user?.company_data?.name) return user.company_data.name;
  if (user?.company_data?.company_name) return user.company_data.company_name;
  
  // Fallback to localStorage (useful right after company creation)
  try {
    const companyStr = localStorage.getItem('company');
    if (companyStr) {
      const company = JSON.parse(companyStr);
      return company.name || company.company_name || null;
    }
  } catch (error) {
    console.error('Error parsing company from localStorage:', error);
  }
  
  // Try user from localStorage as last resort
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const storedUser = JSON.parse(userStr);
      if (storedUser?.company) return storedUser.company;
      if (storedUser?.custom_company) return storedUser.custom_company;
      if (storedUser?.company_name) return storedUser.company_name;
      if (storedUser?.company_data?.name) return storedUser.company_data.name;
      if (storedUser?.company_data?.company_name) return storedUser.company_data.company_name;
    }
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
  }
  
  return null;
}

