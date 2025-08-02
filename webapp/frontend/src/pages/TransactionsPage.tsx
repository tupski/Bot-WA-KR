import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import TransactionFilters, { type TransactionFilters as TFilters } from '@/components/transactions/TransactionFilters'
import TransactionTable from '@/components/transactions/TransactionTable'
import TransactionForm from '@/components/transactions/TransactionForm'
import ExportDialog from '@/components/export/ExportDialog'
import MobileTable from '@/components/mobile/MobileTable'
import Pagination from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { 
  Plus, 
  Download, 
  Upload,
  FileText,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Transaction } from '@/types'

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('checkoutTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Filters state
  const [filters, setFilters] = useState<TFilters>({})

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockTransactions: Transaction[] = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        unit: `${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}${String(Math.floor(Math.random() * 300) + 101).padStart(3, '0')}`,
        location: ['SKY1', 'SKY2', 'SKY3'][Math.floor(Math.random() * 3)],
        amount: Math.floor(Math.random() * 200000) + 100000,
        commission: [50000, 45000, 40000][Math.floor(Math.random() * 3)],
        csName: ['Amel', 'KR', 'APK'][Math.floor(Math.random() * 3)],
        paymentMethod: ['Cash', 'Transfer'][Math.floor(Math.random() * 2)] as 'Cash' | 'Transfer',
        checkoutTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateOnly: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        notes: Math.random() > 0.7 ? 'Special booking request' : undefined
      }))
      
      setTransactions(mockTransactions)
      setFilteredTransactions(mockTransactions)
      setIsLoading(false)
    }

    loadTransactions()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...transactions]

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(t => 
        t.unit.toLowerCase().includes(search) ||
        t.location.toLowerCase().includes(search) ||
        t.csName.toLowerCase().includes(search)
      )
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.dateOnly >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      filtered = filtered.filter(t => t.dateOnly <= filters.dateTo!)
    }

    if (filters.location) {
      filtered = filtered.filter(t => t.location === filters.location)
    }

    if (filters.csName) {
      filtered = filtered.filter(t => t.csName === filters.csName)
    }

    if (filters.paymentMethod) {
      filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod)
    }

    if (filters.minAmount) {
      filtered = filtered.filter(t => t.amount >= filters.minAmount!)
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(t => t.amount <= filters.maxAmount!)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Transaction]
      let bValue: any = b[sortBy as keyof Transaction]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredTransactions(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [transactions, filters, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  const handleFiltersChange = (newFilters: TFilters) => {
    setFilters(newFilters)
  }

  const handleFiltersReset = () => {
    setFilters({})
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }

  const handleDelete = async (transaction: Transaction) => {
    if (window.confirm(`Are you sure you want to delete transaction ${transaction.unit}?`)) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setTransactions(prev => prev.filter(t => t.id !== transaction.id))
        toast.success('Transaction deleted successfully')
      } catch (error) {
        toast.error('Failed to delete transaction')
      }
    }
  }

  const handleView = (transaction: Transaction) => {
    // In real app, this would open a detailed view modal
    console.log('View transaction:', transaction)
    toast.success(`Viewing transaction ${transaction.unit}`)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingTransaction) {
        // Update existing transaction
        setTransactions(prev => prev.map(t => 
          t.id === editingTransaction.id 
            ? { ...t, ...data, updatedAt: new Date().toISOString() }
            : t
        ))
        toast.success('Transaction updated successfully')
      } else {
        // Create new transaction
        const newTransaction: Transaction = {
          id: Math.max(...transactions.map(t => t.id)) + 1,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setTransactions(prev => [newTransaction, ...prev])
        toast.success('Transaction created successfully')
      }
      
      setShowForm(false)
      setEditingTransaction(null)
    } catch (error) {
      toast.error('Failed to save transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) {
      try {
        setIsLoading(true)
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)))
        setSelectedIds([])
        toast.success(`${selectedIds.length} transactions deleted successfully`)
      } catch (error) {
        toast.error('Failed to delete transactions')
      } finally {
        setIsLoading(false)
      }
    }
  }

  if (showForm) {
    return (
      <DashboardLayout>
        <PageWrapper
          title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
          subtitle={editingTransaction ? 'Update transaction details' : 'Create a new transaction record'}
        >
          <TransactionForm
            transaction={editingTransaction || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingTransaction(null)
            }}
            isLoading={isLoading}
          />
        </PageWrapper>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="Transactions"
        subtitle="Manage and track all room booking transactions"
        actions={
          <div className="flex items-center space-x-3">
            {selectedIds.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete ({selectedIds.length})
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
            
            <Button
              onClick={() => setShowForm(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Transaction
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <TransactionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
          isLoading={isLoading}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {filteredTransactions.length}
              </div>
              <div className="text-sm text-gray-600">Total Transactions</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0
                }).format(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0
                }).format(filteredTransactions.reduce((sum, t) => sum + t.commission, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Commission</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">
                {filteredTransactions.length > 0 
                  ? Math.round(filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length)
                  : 0
                }
              </div>
              <div className="text-sm text-gray-600">Avg. Amount</div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table - Desktop */}
        <div className="hidden md:block">
          <TransactionTable
            transactions={paginatedTransactions}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        </div>

        {/* Mobile Table */}
        <div className="md:hidden">
          <MobileTable
            data={paginatedTransactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            isLoading={isLoading}
            emptyMessage="No transactions found"
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={filteredTransactions}
          dataType="transactions"
          title="Export Transactions"
        />
      </PageWrapper>
    </DashboardLayout>
  )
}

export default TransactionsPage
