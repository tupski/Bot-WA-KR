import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Building, 
  MapPin, 
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Save
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

const apartmentSchema = z.object({
  name: z.string().min(1, 'Apartment name is required'),
  location: z.string().min(1, 'Location is required'),
  address: z.string().min(1, 'Address is required'),
  totalUnits: z.number().min(1, 'Total units must be at least 1'),
  pricePerNight: z.number().min(1, 'Price must be greater than 0'),
  commission: z.number().min(0, 'Commission must be 0 or greater'),
  isActive: z.boolean()
})

type ApartmentData = z.infer<typeof apartmentSchema>

interface Apartment extends ApartmentData {
  id: number
  createdAt: string
  updatedAt: string
}

interface ApartmentSettingsProps {
  onSave: (apartments: Apartment[]) => Promise<void>
  isLoading?: boolean
}

const ApartmentSettings: React.FC<ApartmentSettingsProps> = ({
  onSave,
  isLoading = false
}) => {
  const [apartments, setApartments] = useState<Apartment[]>([
    {
      id: 1,
      name: 'SKY1',
      location: 'Kakarama',
      address: 'Jl. Kakarama No. 1, Makassar',
      totalUnits: 150,
      pricePerNight: 150000,
      commission: 50000,
      isActive: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    {
      id: 2,
      name: 'SKY2',
      location: 'Kakarama',
      address: 'Jl. Kakarama No. 2, Makassar',
      totalUnits: 120,
      pricePerNight: 175000,
      commission: 55000,
      isActive: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    {
      id: 3,
      name: 'SKY3',
      location: 'Kakarama',
      address: 'Jl. Kakarama No. 3, Makassar',
      totalUnits: 100,
      pricePerNight: 200000,
      commission: 60000,
      isActive: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    }
  ])
  
  const [showForm, setShowForm] = useState(false)
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ApartmentData>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      name: '',
      location: '',
      address: '',
      totalUnits: 0,
      pricePerNight: 0,
      commission: 0,
      isActive: true
    }
  })

  const handleFormSubmit = async (data: ApartmentData) => {
    try {
      if (editingApartment) {
        // Update existing apartment
        const updatedApartments = apartments.map(apt => 
          apt.id === editingApartment.id 
            ? { ...apt, ...data, updatedAt: new Date().toISOString() }
            : apt
        )
        setApartments(updatedApartments)
        await onSave(updatedApartments)
        toast.success('Apartment updated successfully')
      } else {
        // Add new apartment
        const newApartment: Apartment = {
          id: Math.max(...apartments.map(a => a.id)) + 1,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        const updatedApartments = [...apartments, newApartment]
        setApartments(updatedApartments)
        await onSave(updatedApartments)
        toast.success('Apartment added successfully')
      }
      
      setShowForm(false)
      setEditingApartment(null)
      reset()
    } catch (error) {
      toast.error('Failed to save apartment')
    }
  }

  const handleEdit = (apartment: Apartment) => {
    setEditingApartment(apartment)
    reset(apartment)
    setShowForm(true)
  }

  const handleDelete = async (apartment: Apartment) => {
    if (window.confirm(`Are you sure you want to delete ${apartment.name}?`)) {
      try {
        const updatedApartments = apartments.filter(apt => apt.id !== apartment.id)
        setApartments(updatedApartments)
        await onSave(updatedApartments)
        toast.success('Apartment deleted successfully')
      } catch (error) {
        toast.error('Failed to delete apartment')
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingApartment(null)
    reset()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Apartment Management</span>
            </CardTitle>
            <CardDescription>
              Manage apartment locations, pricing, and availability
            </CardDescription>
          </div>
          
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Apartment
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingApartment ? 'Edit Apartment' : 'Add New Apartment'}
            </h3>
            
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  {...register('name')}
                  label="Apartment Name"
                  placeholder="e.g., SKY1, SKY2"
                  leftIcon={<Building className="h-4 w-4" />}
                  error={errors.name?.message}
                  disabled={isLoading || isSubmitting}
                  required
                />

                <Input
                  {...register('location')}
                  label="Location"
                  placeholder="e.g., Kakarama"
                  leftIcon={<MapPin className="h-4 w-4" />}
                  error={errors.location?.message}
                  disabled={isLoading || isSubmitting}
                  required
                />
              </div>

              <Input
                {...register('address')}
                label="Full Address"
                placeholder="Complete address"
                error={errors.address?.message}
                disabled={isLoading || isSubmitting}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  {...register('totalUnits', { valueAsNumber: true })}
                  type="number"
                  label="Total Units"
                  placeholder="150"
                  error={errors.totalUnits?.message}
                  disabled={isLoading || isSubmitting}
                  min={1}
                  required
                />

                <Input
                  {...register('pricePerNight', { valueAsNumber: true })}
                  type="number"
                  label="Price per Night (IDR)"
                  placeholder="150000"
                  leftIcon={<DollarSign className="h-4 w-4" />}
                  error={errors.pricePerNight?.message}
                  disabled={isLoading || isSubmitting}
                  min={1}
                  step={1000}
                  required
                />

                <Input
                  {...register('commission', { valueAsNumber: true })}
                  type="number"
                  label="Commission (IDR)"
                  placeholder="50000"
                  leftIcon={<DollarSign className="h-4 w-4" />}
                  error={errors.commission?.message}
                  disabled={isLoading || isSubmitting}
                  min={0}
                  step={1000}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  id="apartmentActive"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || isSubmitting}
                />
                <label htmlFor="apartmentActive" className="text-sm font-medium text-gray-700">
                  Active (available for booking)
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <Button
                  type="submit"
                  loading={isLoading || isSubmitting}
                  disabled={isLoading || isSubmitting}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {editingApartment ? 'Update' : 'Add'} Apartment
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading || isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Apartments Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Price/Night</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apartments.map((apartment) => (
              <TableRow key={apartment.id}>
                <TableCell className="font-medium">{apartment.name}</TableCell>
                <TableCell>{apartment.location}</TableCell>
                <TableCell>{apartment.totalUnits}</TableCell>
                <TableCell>{formatCurrency(apartment.pricePerNight)}</TableCell>
                <TableCell>{formatCurrency(apartment.commission)}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    apartment.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {apartment.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(apartment)}
                      disabled={isLoading}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(apartment)}
                      disabled={isLoading}
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

        {apartments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No apartments configured. Add your first apartment to get started.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ApartmentSettings
