// Utility to check how many users are registered
export const getUserCount = (): number => {
  try {
    const usersStr = localStorage.getItem('users');
    if (usersStr) {
      const users = JSON.parse(usersStr);
      return Array.isArray(users) ? users.length : 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
};

export const listUsers = (): any[] => {
  try {
    const usersStr = localStorage.getItem('users');
    if (usersStr) {
      const users = JSON.parse(usersStr);
      return Array.isArray(users) ? users : [];
    }
    return [];
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
};

export const clearAllUsers = (): void => {
  try {
    localStorage.removeItem('users');
    localStorage.removeItem('currentUser');
    console.log('All users cleared from localStorage');
  } catch (error) {
    console.error('Error clearing users:', error);
  }
};