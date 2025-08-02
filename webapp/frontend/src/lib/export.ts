import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { saveAs } from 'file-saver'
import { formatCurrency, formatDateTime } from './utils'
import type { Transaction } from '@/types'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportOptions {
  filename?: string
  title?: string
  subtitle?: string
  includeTimestamp?: boolean
}

export class ExportService {
  // Export transactions to Excel
  static exportTransactionsToExcel(
    transactions: Transaction[], 
    options: ExportOptions = {}
  ) {
    const {
      filename = 'transactions',
      title = 'Transactions Report',
      includeTimestamp = true
    } = options

    // Prepare data
    const data = transactions.map(transaction => ({
      'Unit': transaction.unit,
      'Location': transaction.location,
      'Amount': transaction.amount,
      'Commission': transaction.commission,
      'CS Name': transaction.csName,
      'Payment Method': transaction.paymentMethod,
      'Checkout Time': formatDateTime(transaction.checkoutTime),
      'Date': transaction.dateOnly,
      'Notes': transaction.notes || ''
    }))

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths
    const colWidths = [
      { wch: 10 }, // Unit
      { wch: 12 }, // Location
      { wch: 15 }, // Amount
      { wch: 15 }, // Commission
      { wch: 12 }, // CS Name
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Checkout Time
      { wch: 12 }, // Date
      { wch: 30 }  // Notes
    ]
    ws['!cols'] = colWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

    // Generate filename
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.xlsx`

    // Save file
    XLSX.writeFile(wb, finalFilename)
  }

  // Export transactions to CSV
  static exportTransactionsToCSV(
    transactions: Transaction[], 
    options: ExportOptions = {}
  ) {
    const {
      filename = 'transactions',
      includeTimestamp = true
    } = options

    // Prepare data
    const headers = [
      'Unit',
      'Location', 
      'Amount',
      'Commission',
      'CS Name',
      'Payment Method',
      'Checkout Time',
      'Date',
      'Notes'
    ]

    const rows = transactions.map(transaction => [
      transaction.unit,
      transaction.location,
      transaction.amount,
      transaction.commission,
      transaction.csName,
      transaction.paymentMethod,
      formatDateTime(transaction.checkoutTime),
      transaction.dateOnly,
      transaction.notes || ''
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and save
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.csv`
    
    saveAs(blob, finalFilename)
  }

  // Export transactions to PDF
  static exportTransactionsToPDF(
    transactions: Transaction[], 
    options: ExportOptions = {}
  ) {
    const {
      filename = 'transactions',
      title = 'Transactions Report',
      subtitle = 'Generated from Kakarama Room Dashboard',
      includeTimestamp = true
    } = options

    const doc = new jsPDF()

    // Add title
    doc.setFontSize(20)
    doc.text(title, 20, 20)

    // Add subtitle
    if (subtitle) {
      doc.setFontSize(12)
      doc.text(subtitle, 20, 30)
    }

    // Add generation date
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString('id-ID')}`, 20, 40)

    // Prepare table data
    const tableData = transactions.map(transaction => [
      transaction.unit,
      transaction.location,
      formatCurrency(transaction.amount),
      formatCurrency(transaction.commission),
      transaction.csName,
      transaction.paymentMethod,
      formatDateTime(transaction.checkoutTime)
    ])

    // Add table
    doc.autoTable({
      head: [['Unit', 'Location', 'Amount', 'Commission', 'CS', 'Payment', 'Checkout Time']],
      body: tableData,
      startY: 50,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })

    // Add summary
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
    const totalCommission = transactions.reduce((sum, t) => sum + t.commission, 0)
    
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Summary:', 20, finalY)
    doc.setFontSize(10)
    doc.text(`Total Transactions: ${transactions.length}`, 20, finalY + 10)
    doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 20, finalY + 20)
    doc.text(`Total Commission: ${formatCurrency(totalCommission)}`, 20, finalY + 30)

    // Generate filename and save
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.pdf`
    
    doc.save(finalFilename)
  }

  // Export report data to Excel
  static exportReportToExcel(
    reportData: any,
    options: ExportOptions = {}
  ) {
    const {
      filename = 'report',
      title = 'Analytics Report',
      includeTimestamp = true
    } = options

    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ['Report Title', title],
      ['Generated On', new Date().toLocaleString('id-ID')],
      ['Period', reportData.period || 'N/A'],
      [''],
      ['Total Revenue', reportData.totalRevenue || 0],
      ['Total Commission', reportData.totalCommission || 0],
      ['Total Bookings', reportData.totalBookings || 0],
      ['Average Amount', reportData.averageAmount || 0]
    ]

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Chart data sheet
    if (reportData.chartData) {
      const chartWs = XLSX.utils.json_to_sheet(reportData.chartData)
      XLSX.utils.book_append_sheet(wb, chartWs, 'Chart Data')
    }

    // Generate filename and save
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.xlsx`
    
    XLSX.writeFile(wb, finalFilename)
  }

  // Export CS performance to Excel
  static exportCSPerformanceToExcel(
    csData: any[],
    options: ExportOptions = {}
  ) {
    const {
      filename = 'cs_performance',
      title = 'CS Performance Report',
      includeTimestamp = true
    } = options

    // Prepare data
    const data = csData.map(cs => ({
      'CS Name': cs.name,
      'Total Bookings': cs.totalBookings,
      'Total Revenue': cs.totalRevenue,
      'Total Commission': cs.totalCommission,
      'Average Amount': cs.averageAmount,
      'Conversion Rate': `${cs.conversionRate}%`,
      'Response Time': `${cs.responseTime} min`,
      'Rating': cs.rating,
      'Rank': cs.rank,
      'Growth': `${cs.growth}%`,
      'Status': cs.isActive ? 'Active' : 'Inactive'
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths
    const colWidths = [
      { wch: 12 }, // CS Name
      { wch: 15 }, // Total Bookings
      { wch: 15 }, // Total Revenue
      { wch: 15 }, // Total Commission
      { wch: 15 }, // Average Amount
      { wch: 15 }, // Conversion Rate
      { wch: 15 }, // Response Time
      { wch: 10 }, // Rating
      { wch: 8 },  // Rank
      { wch: 10 }, // Growth
      { wch: 10 }  // Status
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'CS Performance')

    // Generate filename and save
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.xlsx`
    
    XLSX.writeFile(wb, finalFilename)
  }

  // Generic export function
  static exportData(
    data: any[],
    format: 'excel' | 'csv' | 'pdf',
    options: ExportOptions = {}
  ) {
    switch (format) {
      case 'excel':
        return this.exportToExcel(data, options)
      case 'csv':
        return this.exportToCSV(data, options)
      case 'pdf':
        return this.exportToPDF(data, options)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // Generic Excel export
  private static exportToExcel(data: any[], options: ExportOptions) {
    const { filename = 'export', includeTimestamp = true } = options
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Data')

    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.xlsx`
    
    XLSX.writeFile(wb, finalFilename)
  }

  // Generic CSV export
  private static exportToCSV(data: any[], options: ExportOptions) {
    const { filename = 'export', includeTimestamp = true } = options
    
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const rows = data.map(item => headers.map(header => item[header]))

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.csv`
    
    saveAs(blob, finalFilename)
  }

  // Generic PDF export
  private static exportToPDF(data: any[], options: ExportOptions) {
    const { 
      filename = 'export', 
      title = 'Data Export',
      subtitle = 'Generated from Dashboard',
      includeTimestamp = true 
    } = options

    if (data.length === 0) return

    const doc = new jsPDF()

    // Add title
    doc.setFontSize(20)
    doc.text(title, 20, 20)

    if (subtitle) {
      doc.setFontSize(12)
      doc.text(subtitle, 20, 30)
    }

    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString('id-ID')}`, 20, 40)

    // Prepare table data
    const headers = Object.keys(data[0])
    const tableData = data.map(item => headers.map(header => item[header]))

    // Add table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 50,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })

    // Generate filename and save
    const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : ''
    const finalFilename = `${filename}${timestamp}.pdf`
    
    doc.save(finalFilename)
  }
}
