import React, { useState } from 'react'
import { 
  Users, 
  Shield, 
  Edit,
  Trash2,
  Plus,
  Crown,
  User,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { cn, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  isActive: boolean
  lastLogin: string
  createdAt: string
  permissions: string[]
}

interface UserPermissionsProps {
  onSave: (users: User[]) => Promise<void>
  isLoading?: boolean
}

const UserPermissions: React.FC<UserPermissionsProps> = ({
  onSave,
  isLoading = false
}) => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      username: 'admin',
      email: 'admin@kakarama.com',
      role: 'admin',
      isActive: true,
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-01-01',
      permissions: ['all']
    },
    {
      id: 2,
      username: 'manager1',
      email: 'manager@kakarama.com',
      role: 'manager',
      isActive: true,
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-02-01',
      permissions: ['view_dashboard', 'manage_transactions', 'view_reports', 'manage_cs']
    },
    {
      id: 3,
      username: 'viewer1',
      email: 'viewer@kakarama.com',
      role: 'viewer',
      isActive: true,
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2023-03-01',
      permissions: ['view_dashboard', 'view_reports']
    }
  ])

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPermissions, setShowPermissions] = useState(false)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-yellow-100 text-yellow-800',
      manager: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        colors[role as keyof typeof colors]
      )}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </span>
    )
  }

  const handleToggleActive = async (user: User) => {
    try {
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { ...u, isActive: !u.isActive }
          : u
      )
      setUsers(updatedUsers)
      await onSave(updatedUsers)
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`)
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleDelete = async (user: User) => {
    if (user.role === 'admin') {
      toast.error('Cannot delete admin user')
      return
    }
    
    if (window.confirm(`Are you sure you want to delete user ${user.username}?`)) {
      try {
        const updatedUsers = users.filter(u => u.id !== user.id)
        setUsers(updatedUsers)
        await onSave(updatedUsers)
        toast.success('User deleted successfully')
      } catch (error) {
        toast.error('Failed to delete user')
      }
    }
  }

  const handleViewPermissions = (user: User) => {
    setSelectedUser(user)
    setShowPermissions(true)
  }

  const availablePermissions = [
    { id: 'view_dashboard', name: 'View Dashboard', description: 'Access to main dashboard' },
    { id: 'manage_transactions', name: 'Manage Transactions', description: 'Create, edit, delete transactions' },
    { id: 'view_reports', name: 'View Reports', description: 'Access to reports and analytics' },
    { id: 'manage_cs', name: 'Manage CS', description: 'Manage customer service representatives' },
    { id: 'system_config', name: 'System Configuration', description: 'Access to system settings' },
    { id: 'user_management', name: 'User Management', description: 'Manage users and permissions' },
    { id: 'export_data', name: 'Export Data', description: 'Export reports and data' }
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            
            <Button
              onClick={() => toast.success('Add user functionality would be implemented here')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add User
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  
                  <TableCell className="text-sm text-gray-600">
                    {formatDateTime(user.lastLogin)}
                  </TableCell>
                  
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={isLoading || user.role === 'admin'}
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors",
                        user.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200',
                        (isLoading || user.role === 'admin') && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPermissions(user)}
                    >
                      View ({user.permissions.length})
                    </Button>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.success('Edit user functionality would be implemented here')}
                        disabled={isLoading}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        disabled={isLoading || user.role === 'admin'}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions Modal */}
      {showPermissions && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>
                Permissions for {selectedUser.username}
              </CardTitle>
              <CardDescription>
                {getRoleBadge(selectedUser.role)} permissions
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {availablePermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      selectedUser.permissions.includes(permission.id) || selectedUser.permissions.includes('all')
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {permission.name}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {permission.description}
                      </p>
                    </div>
                    
                    <div className={cn(
                      "w-4 h-4 rounded-full",
                      selectedUser.permissions.includes(permission.id) || selectedUser.permissions.includes('all')
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    )} />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowPermissions(false)}
                >
                  Close
                </Button>
                
                <Button
                  onClick={() => toast.success('Edit permissions functionality would be implemented here')}
                >
                  Edit Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default UserPermissions
