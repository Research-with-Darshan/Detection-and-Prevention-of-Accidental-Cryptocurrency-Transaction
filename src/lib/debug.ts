// Debug utility for localStorage operations
export const debugLocalStorage = {
  // Get all users
  getUsers: (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('users') || '[]');
    } catch (error) {
      console.error('Error getting users from localStorage:', error);
      return [];
    }
  },
  
  // Get current user
  getCurrentUser: (): any => {
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user from localStorage:', error);
      return null;
    }
  },
  
  // Add a user
  addUser: (user: any): boolean => {
    try {
      const users = debugLocalStorage.getUsers();
      users.push(user);
      localStorage.setItem('users', JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Error adding user to localStorage:', error);
      return false;
    }
  },
  
  // Clear all users
  clearUsers: (): void => {
    try {
      localStorage.removeItem('users');
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Error clearing users from localStorage:', error);
    }
  },
  
  // Find user by username (case insensitive)
  findUser: (username: string): any => {
    try {
      const users = debugLocalStorage.getUsers();
      return users.find((u: any) => 
        u.username.toLowerCase() === username.toLowerCase()
      );
    } catch (error) {
      console.error('Error finding user in localStorage:', error);
      return null;
    }
  }
};