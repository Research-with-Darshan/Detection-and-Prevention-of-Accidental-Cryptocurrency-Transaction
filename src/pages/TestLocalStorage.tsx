import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { SecureButton } from '@/components/ui/secure-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService, User } from '@/services/authService';
import { debugUsers } from '@/utils/debugUsers';

export default function TestLocalStorage() {
  const [users, setUsers] = useState<User[]>([]);
  const [localStorageData, setLocalStorageData] = useState<string>('');
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  
  useEffect(() => {
    loadUsers();
    loadLocalStorageData();
  }, []);
  
  const loadUsers = () => {
    try {
      const usersData = authService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };
  
  const loadLocalStorageData = () => {
    try {
      // Get all localStorage data
      let data = '';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          data += `${key}: ${value}\n`;
        }
      }
      setLocalStorageData(data);
    } catch (error) {
      console.error('Error loading localStorage data:', error);
      setLocalStorageData('Error accessing localStorage data');
    }
  };
  
  const addUser = async () => {
    if (newUser.username && newUser.password) {
      const result = await authService.register({
        username: newUser.username,
        password: authService.hashPassword(newUser.password),
        realName: 'Test User',
        email: `${newUser.username}@test.com`,
        phone: '1234567890',
        country: 'US',
        dateOfBirth: '1990-01-01',
      });
      
      if (result.success) {
        setNewUser({ username: '', password: '' });
        loadUsers();
        loadLocalStorageData();
      }
    }
  };
  
  const clearAllUsers = () => {
    authService.clearAllUsers();
    setUsers([]);
    loadLocalStorageData();
  };
  
  // Debug functions
  const debugListUsers = () => {
    debugUsers.listUsers();
  };
  
  const debugRawStorage = () => {
    const data = debugUsers.getRawStorage();
    console.log('Raw localStorage data:', data);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <GlassCard>
          <h1 className="text-2xl font-bold mb-6">Authentication Debugging</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Add Test User</h2>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                />
              </div>
              
              <div className="flex gap-2">
                <SecureButton onClick={addUser}>Add User</SecureButton>
                <SecureButton variant="outline" onClick={loadUsers}>Refresh</SecureButton>
                <SecureButton variant="destructive" onClick={clearAllUsers}>Clear All</SecureButton>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Stored Users ({users.length})</h2>
              {users.length === 0 ? (
                <p className="text-muted-foreground">No users found in localStorage</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="p-3 bg-input/50 rounded-lg">
                      <p><strong>Username:</strong> {user.username}</p>
                      <p><strong>Real Name:</strong> {user.realName}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>ID:</strong> {user.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
        
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          {authService.isAuthenticated() ? (
            <div className="p-3 bg-input/50 rounded-lg">
              <p><strong>Username:</strong> {authService.getCurrentUser()?.username}</p>
              <p><strong>Real Name:</strong> {authService.getCurrentUser()?.realName}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No user is currently logged in</p>
          )}
        </GlassCard>
        
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Debug Tools</h2>
          <div className="flex gap-2">
            <SecureButton variant="outline" onClick={debugListUsers}>List Users (Detailed)</SecureButton>
            <SecureButton variant="outline" onClick={debugRawStorage}>Show Raw Storage</SecureButton>
          </div>
        </GlassCard>
        
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">LocalStorage Data</h2>
          <div className="bg-input/50 rounded-lg p-4 max-h-60 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap">{localStorageData || 'No localStorage data'}</pre>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}