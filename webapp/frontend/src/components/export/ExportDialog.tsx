import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
  File,
  X,
  Calendar,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ExportService, type ExportOptions } from '@/lib/export'
import toast from 'react-hot-toast'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  data: any[]
  dataType: 'transactions' | 'reports' | 'cs-performance' | 'logs'
  title?: string
}

interface ExportFormData {
  format: 'excel' | 'csv' | 'pdf'
  filename: string
  includeTimestamp: boolean
  dateRange?: {
    from: string
    to: string
  }
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  data,
  dataType,
  title
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ExportFormData>({
    defaultValues: {
      format: 'excel',
      filename: getDefaultFilename(dataType),
      includeTimestamp: true
    }
  })

  const selectedFormat = watch('format')

  function getDefaultFilename(type: string): string {
    switch (type) {
      case 'transactions':
        return 'transactions_export'
      case 'reports':
        return 'analytics_report'
      case 'cs-performance':
        return 'cs_performance_report'
      case 'logs':
        return 'system_logs'
      default:
        return 'data_export'
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      case 'csv':
        return <File className="h-4 w-4 text-blue-600" />
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'excel':
        return 'Excel spreadsheet with formatting and multiple sheets'
      case 'csv':
        return 'Comma-separated values file for data analysis'
      case 'pdf':
        return 'PDF document with formatted tables and summary'
      default:
        return ''
    }
  }

  const handleExport = async (formData: ExportFormData) => {
    if (data.length === 0) {
      toast.error('No data to export')
      return
    }

    setIsExporting(true)

    try {
      const options: ExportOptions = {
        filename: formData.filename,
        title: title || `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Export`,
        subtitle: 'Generated from Kakarama Room Dashboard',
        includeTimestamp: formData.includeTimestamp
      }

      // Add small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))

      switch (dataType) {
        case 'transactions':
          if (formData.format === 'excel') {
            ExportService.exportTransactionsToExcel(data, options)
          } else if (formData.format === 'csv') {
            ExportService.exportTransactionsToCSV(data, options)
          } else if (formData.format === 'pdf') {
            ExportService.exportTransactionsToPDF(data, options)
          }
          break

        case 'cs-performance':
          if (formData.format === 'excel') {
            ExportService.exportCSPerformanceToExcel(data, options)
          } else {
            ExportService.exportData(data, formData.format, options)
          }
          break

        case 'reports':
          if (formData.format === 'excel') {
            ExportService.exportReportToExcel(data, options)
          } else {
            ExportService.exportData(data, formData.format, options)
          }
          break

        default:
          ExportService.exportData(data, formData.format, options)
          break
      }

      toast.success(`Export completed! File downloaded as ${formData.format.toUpperCase()}`)
      onClose()
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Export Data</span>
              </CardTitle>
              <CardDescription>
                Export {data.length} {dataType.replace('-', ' ')} records
              </CardDescription>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(handleExport)} className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Export Format</label>
              
              <div className="space-y-2">
                {[
                  { value: 'excel', label: 'Excel (.xlsx)', icon: 'excel' },
                  { value: 'csv', label: 'CSV (.csv)', icon: 'csv' },
                  { value: 'pdf', label: 'PDF (.pdf)', icon: 'pdf' }
                ].map(format => (
                  <label
                    key={format.value}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      {...register('format')}
                      type="radio"
                      value={format.value}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      disabled={isExporting}
                    />
                    
                    <div className="flex items-center space-x-2 flex-1">
                      {getFormatIcon(format.value)}
                      <div>
                        <div className="font-medium text-gray-900">{format.label}</div>
                        <div className="text-sm text-gray-600">
                          {getFormatDescription(format.value)}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filename */}
            <Input
              {...register('filename', { 
                required: 'Filename is required',
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message: 'Filename can only contain letters, numbers, hyphens, and underscores'
                }
              })}
              label="Filename"
              placeholder="my_export_file"
              error={errors.filename?.message}
              disabled={isExporting}
              helperText="File extension will be added automatically"
              required
            />

            {/* Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Export Options</label>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    {...register('includeTimestamp')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isExporting}
                  />
                  <span className="text-sm text-gray-700">Include timestamp in filename</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Preview:</div>
              <div className="font-mono text-sm text-gray-900">
                {watch('filename') || 'filename'}
                {watch('includeTimestamp') && `_${new Date().toISOString().split('T')[0]}`}
                .{selectedFormat === 'excel' ? 'xlsx' : selectedFormat}
              </div>
            </div>

            {/* Data Summary */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-1">Export Summary</div>
              <div className="text-sm text-blue-800">
                • {data.length} records will be exported
                • Format: {selectedFormat.toUpperCase()}
                • Generated on: {new Date().toLocaleString('id-ID')}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                loading={isExporting}
                disabled={isExporting || data.length === 0}
                leftIcon={<Download className="h-4 w-4" />}
              >
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExportDialog
