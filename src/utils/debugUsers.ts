// Utility to debug user storage issues
export const debugUsers = {
  // Get raw localStorage data
  getRawStorage: () => {
    try {
      const users = localStorage.getItem('users');
      const currentUser = localStorage.getItem('currentUser');
      return {
        users: users ? JSON.parse(users) : null,
        currentUser: currentUser ? JSON.parse(currentUser) : null,
        usersString: users,
        currentUserString: currentUser
      };
    } catch (error) {
      console.error('Error getting raw storage:', error);
      return {
        users: null,
        currentUser: null,
        usersString: null,
        currentUserString: null
      };
    }
  },
  
  // List all users with detailed info
  listUsers: () => {
    try {
      const users = localStorage.getItem('users');
      if (users) {
        const parsedUsers = JSON.parse(users);
        console.log('=== ALL USERS IN LOCALSTORAGE ===');
        console.log('Total users:', parsedUsers.length);
        parsedUsers.forEach((user: any, index: number) => {
          console.log(`User ${index + 1}:`);
          console.log('  ID:', user.id);
          console.log('  Username:', user.username);
          console.log('  Real Name:', user.realName);
          console.log('  Email:', user.email);
          console.log('  Password (hashed):', user.password);
          console.log('  Created At:', user.createdAt);
          console.log('---');
        });
        return parsedUsers;
      } else {
        console.log('No users found in localStorage');
        return [];
      }
    } catch (error) {
      console.error('Error listing users:', error);
      return [];
    }
  },
  
  // Find user by exact username
  findUserExact: (username: string) => {
    try {
      const users = localStorage.getItem('users');
      if (users) {
        const parsedUsers = JSON.parse(users);
        const user = parsedUsers.find((u: any) => u.username === username);
        console.log(`Finding user with exact match for "${username}":`, user);
        return user;
      }
      return undefined;
    } catch (error) {
      console.error('Error finding user:', error);
      return undefined;
    }
  },
  
  // Find user by case-insensitive username
  findUserCaseInsensitive: (username: string) => {
    try {
      const users = localStorage.getItem('users');
      if (users) {
        const parsedUsers = JSON.parse(users);
        const user = parsedUsers.find((u: any) => 
          u.username.toLowerCase() === username.toLowerCase());
        console.log(`Finding user with case-insensitive match for "${username}":`, user);
        return user;
      }
      return undefined;
    } catch (error) {
      console.error('Error finding user:', error);
      return undefined;
    }
  },
  
  // Clear all user data
  clearAll: () => {
    try {
      localStorage.removeItem('users');
      localStorage.removeItem('currentUser');
      console.log('Cleared all user data from localStorage');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }
};