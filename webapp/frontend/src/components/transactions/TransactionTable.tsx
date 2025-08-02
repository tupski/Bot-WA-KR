import React, { useState } from 'react'
import { 
  Edit, 
  Trash2, 
  Eye, 
  MoreHorizontal,
  ArrowUpDown,
  CheckSquare,
  Square
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import type { Transaction } from '@/types'

interface TransactionTableProps {
  transactions: Transaction[]
  isLoading?: boolean
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onView: (transaction: Transaction) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort: (column: string) => void
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  isLoading = false,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  sortBy,
  sortOrder,
  onSort
}) => {
  const [showActions, setShowActions] = useState<number | null>(null)

  const handleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(transactions.map(t => t.id))
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    }
    return (
      <ArrowUpDown className={cn(
        "h-3 w-3",
        sortOrder === 'asc' ? 'text-blue-600 rotate-180' : 'text-blue-600'
      )} />
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      'Cash': 'bg-green-100 text-green-800',
      'Transfer': 'bg-blue-100 text-blue-800'
    }
    
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      )}>
        {method}
      </span>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Transactions ({transactions.length})
          </CardTitle>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedIds.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('Bulk delete:', selectedIds)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center w-4 h-4"
                  >
                    {selectedIds.length === transactions.length && transactions.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </TableHead>
                
                <TableHead>
                  <button
                    onClick={() => onSort('unit')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Unit</span>
                    {getSortIcon('unit')}
                  </button>
                </TableHead>
                
                <TableHead>
                  <button
                    onClick={() => onSort('location')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Location</span>
                    {getSortIcon('location')}
                  </button>
                </TableHead>
                
                <TableHead>
                  <button
                    onClick={() => onSort('amount')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Amount</span>
                    {getSortIcon('amount')}
                  </button>
                </TableHead>
                
                <TableHead>CS Name</TableHead>
                <TableHead>Payment</TableHead>
                
                <TableHead>
                  <button
                    onClick={() => onSort('checkoutTime')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Checkout Time</span>
                    {getSortIcon('checkoutTime')}
                  </button>
                </TableHead>
                
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className={cn(
                      selectedIds.includes(transaction.id) && "bg-blue-50"
                    )}
                  >
                    <TableCell>
                      <button
                        onClick={() => handleSelectOne(transaction.id)}
                        className="flex items-center justify-center w-4 h-4"
                      >
                        {selectedIds.includes(transaction.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </TableCell>
                    
                    <TableCell className="font-medium">
                      {transaction.unit}
                    </TableCell>
                    
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {transaction.location}
                      </span>
                    </TableCell>
                    
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    
                    <TableCell>{transaction.csName}</TableCell>
                    
                    <TableCell>
                      {getPaymentMethodBadge(transaction.paymentMethod)}
                    </TableCell>
                    
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(transaction.checkoutTime)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowActions(
                            showActions === transaction.id ? null : transaction.id
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        
                        {showActions === transaction.id && (
                          <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  onView(transaction)
                                  setShowActions(null)
                                }}
                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  onEdit(transaction)
                                  setShowActions(null)
                                }}
                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  onDelete(transaction)
                                  setShowActions(null)
                                }}
                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Click outside to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowActions(null)}
        />
      )}
    </Card>
  )
}

export default TransactionTable
