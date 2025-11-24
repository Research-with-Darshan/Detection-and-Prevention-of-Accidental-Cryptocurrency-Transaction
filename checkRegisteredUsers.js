// Script to check how many users are registered in the application
// This script simulates checking localStorage in a browser environment

console.log('=== Bio Cashflow User Registration Check ===\n');

// Simulate localStorage data (this would normally be in the browser)
// In a real scenario, this data would be populated by the application
const localStorageData = {
  // This is sample data - in a real application, this would be populated by user registrations
  'users': JSON.stringify([
    {
      id: 'user1',
      username: 'john_doe',
      realName: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password_1', // This would be properly hashed
      phone: '+1234567890',
      country: 'US',
      dateOfBirth: '1990-01-15',
      createdAt: '2023-06-01T10:00:00Z'
    },
    {
      id: 'user2',
      username: 'jane_smith',
      realName: 'Jane Smith',
      email: 'jane@example.com',
      password: 'hashed_password_2',
      phone: '+0987654321',
      country: 'CA',
      dateOfBirth: '1985-03-22',
      createdAt: '2023-06-02T14:30:00Z'
    }
  ]),
  'currentUser': JSON.stringify({
    id: 'user1',
    username: 'john_doe',
    realName: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    dateOfBirth: '1990-01-15',
    createdAt: '2023-06-01T10:00:00Z'
  })
};

// Function to get user count from localStorage
function getUserCount() {
  try {
    const usersStr = localStorageData['users'];
    if (usersStr) {
      const users = JSON.parse(usersStr);
      return Array.isArray(users) ? users.length : 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
}

// Function to list all users
function listUsers() {
  try {
    const usersStr = localStorageData['users'];
    if (usersStr) {
      const users = JSON.parse(usersStr);
      return Array.isArray(users) ? users : [];
    }
    return [];
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

// Function to get current user
function getCurrentUser() {
  try {
    const userStr = localStorageData['currentUser'];
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Display results
const userCount = getUserCount();
console.log(`Total registered users: ${userCount}`);

const users = listUsers();
if (users.length > 0) {
  console.log('\nRegistered users:');
  users.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.username} (${user.email}) - Registered on ${new Date(user.createdAt).toLocaleDateString()}`);
  });
} else {
  console.log('\nNo users are currently registered.');
}

const currentUser = getCurrentUser();
if (currentUser) {
  console.log(`\nCurrently logged in user: ${currentUser.username} (${currentUser.email})`);
} else {
  console.log('\nNo user is currently logged in.');
}

console.log('\n=== End of Report ===');

// Instructions for checking actual data in browser
console.log('\nTo check actual user data in your browser:');
console.log('1. Open the application in your browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to the Console tab');
console.log('4. Run: localStorage.getItem("users")');
console.log('5. Run: localStorage.getItem("currentUser")');