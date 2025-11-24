// Simple Node.js script to check user count in localStorage
// This is for demonstration purposes only

console.log('Checking user count in localStorage...');

// In a real browser environment, you would access localStorage directly
// For this demo, we'll simulate what localStorage might contain

// Simulated localStorage data
const simulatedLocalStorage = {
  'users': JSON.stringify([
    {
      id: '1',
      username: 'testuser1',
      realName: 'Test User 1',
      email: 'test1@example.com',
      password: 'hashed_password_1',
      phone: '1234567890',
      country: 'US',
      dateOfBirth: '1990-01-01',
      createdAt: '2023-01-01T00:00:00Z'
    },
    {
      id: '2',
      username: 'testuser2',
      realName: 'Test User 2',
      email: 'test2@example.com',
      password: 'hashed_password_2',
      phone: '0987654321',
      country: 'CA',
      dateOfBirth: '1995-05-15',
      createdAt: '2023-02-01T00:00:00Z'
    }
  ]),
  'currentUser': JSON.stringify({
    id: '1',
    username: 'testuser1',
    realName: 'Test User 1',
    email: 'test1@example.com',
    phone: '1234567890',
    country: 'US',
    dateOfBirth: '1990-01-01',
    createdAt: '2023-01-01T00:00:00Z'
  })
};

// Function to get user count
function getUserCount() {
  try {
    const usersStr = simulatedLocalStorage['users'];
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

// Function to list users
function listUsers() {
  try {
    const usersStr = simulatedLocalStorage['users'];
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

// Get and display user count
const userCount = getUserCount();
console.log(`Total users registered: ${userCount}`);

// List all users
const users = listUsers();
if (users.length > 0) {
  console.log('\nRegistered users:');
  users.forEach((user, index) => {
    console.log(`${index + 1}. Username: ${user.username}, Email: ${user.email}`);
  });
} else {
  console.log('No users found.');
}

// Check current user
try {
  const currentUserStr = simulatedLocalStorage['currentUser'];
  if (currentUserStr) {
    const currentUser = JSON.parse(currentUserStr);
    console.log(`\nCurrent logged in user: ${currentUser.username}`);
  } else {
    console.log('\nNo user currently logged in.');
  }
} catch (error) {
  console.error('Error getting current user:', error);
}