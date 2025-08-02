import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface ChartData {
  date: string
  revenue: number
  commission: number
  bookings: number
  [key: string]: any
}

interface ReportChartsProps {
  data: ChartData[]
  type: 'revenue' | 'bookings' | 'cs-performance' | 'location-analysis'
  title?: string
  description?: string
  height?: number
}

const ReportCharts: React.FC<ReportChartsProps> = ({
  data,
  type,
  title,
  description,
  height = 400
}) => {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'bookings' || name.includes('count')) {
      return [value, name]
    }
    return [formatCurrency(value), name]
  }

  const formatXAxisLabel = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.toLocaleDateString('id-ID', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const renderChart = () => {
    switch (type) {
      case 'revenue':
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              yAxisId="left"
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="#666"
              fontSize={12}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Date: ${formatXAxisLabel(label)}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="revenue" 
              fill="#3b82f6" 
              name="Revenue"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="left"
              dataKey="commission" 
              fill="#10b981" 
              name="Commission"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="bookings" 
              stroke="#f59e0b" 
              strokeWidth={3}
              name="Bookings"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        )

      case 'bookings':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Date: ${formatXAxisLabel(label)}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="bookings"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              name="Total Bookings"
            />
          </AreaChart>
        )

      case 'cs-performance':
        return (
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number"
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis 
              type="category"
              dataKey="csName"
              stroke="#666"
              fontSize={12}
              width={80}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Bar 
              dataKey="revenue" 
              fill="#3b82f6" 
              name="Revenue"
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="commission" 
              fill="#10b981" 
              name="Commission"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        )

      case 'location-analysis':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) =>
                `${name}: ${formatCurrency(value || 0)} (${((percent || 0) * 100).toFixed(1)}%)`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="revenue"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </PieChart>
        )

      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Date: ${formatXAxisLabel(label)}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Revenue"
            />
          </LineChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default ReportCharts
