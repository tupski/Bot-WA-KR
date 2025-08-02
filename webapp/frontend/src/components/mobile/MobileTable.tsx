import React, { useState } from 'react'
import { 
  ChevronDown, 
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import type { Transaction } from '@/types'

interface MobileTableProps {
  data: Transaction[]
  onView?: (item: Transaction) => void
  onEdit?: (item: Transaction) => void
  onDelete?: (item: Transaction) => void
  isLoading?: boolean
  emptyMessage?: string
}

const MobileTable: React.FC<MobileTableProps> = ({
  data,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
  emptyMessage = 'No data available'
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [showActions, setShowActions] = useState<number | null>(null)

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const toggleActions = (id: number) => {
    setShowActions(showActions === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const isExpanded = expandedItems.has(item.id)
        const showItemActions = showActions === item.id

        return (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Main Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(item.id)}
                      className="p-0 h-auto"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    
                    <div>
                      <h3 className="font-medium text-gray-900">{item.unit}</h3>
                      <p className="text-sm text-gray-600">{item.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(item.amount)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.paymentMethod}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActions(item.id)}
                      className="p-1"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{item.csName}</span>
                  <span>{formatDateTime(item.checkoutTime)}</span>
                </div>

                {/* Actions Menu */}
                {showItemActions && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onView(item)
                            setShowActions(null)
                          }}
                          leftIcon={<Eye className="h-3 w-3" />}
                          className="flex-1"
                        >
                          View
                        </Button>
                      )}
                      
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onEdit(item)
                            setShowActions(null)
                          }}
                          leftIcon={<Edit className="h-3 w-3" />}
                          className="flex-1"
                        >
                          Edit
                        </Button>
                      )}
                      
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onDelete(item)
                            setShowActions(null)
                          }}
                          leftIcon={<Trash2 className="h-3 w-3" />}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Commission:</span>
                        <div className="font-medium">{formatCurrency(item.commission)}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <div className="font-medium">{item.dateOnly}</div>
                      </div>
                      
                      {item.notes && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Notes:</span>
                          <div className="font-medium">{item.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default MobileTable
