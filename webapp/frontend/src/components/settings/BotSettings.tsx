import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Bot, 
  MessageSquare, 
  Clock, 
  Shield,
  Save,
  RotateCcw,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import toast from 'react-hot-toast'

const botSettingsSchema = z.object({
  botName: z.string().min(1, 'Bot name is required'),
  welcomeMessage: z.string().min(1, 'Welcome message is required'),
  helpMessage: z.string().min(1, 'Help message is required'),
  errorMessage: z.string().min(1, 'Error message is required'),
  responseDelay: z.number().min(0, 'Response delay must be 0 or greater').max(10, 'Response delay cannot exceed 10 seconds'),
  maxRetries: z.number().min(1, 'Max retries must be at least 1').max(5, 'Max retries cannot exceed 5'),
  sessionTimeout: z.number().min(5, 'Session timeout must be at least 5 minutes').max(120, 'Session timeout cannot exceed 120 minutes'),
  enableLogging: z.boolean(),
  enableAnalytics: z.boolean(),
  maintenanceMode: z.boolean(),
  autoReply: z.boolean()
})

type BotSettingsData = z.infer<typeof botSettingsSchema>

interface BotSettingsProps {
  onSave: (data: BotSettingsData) => Promise<void>
  isLoading?: boolean
}

const BotSettings: React.FC<BotSettingsProps> = ({
  onSave,
  isLoading = false
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch
  } = useForm<BotSettingsData>({
    resolver: zodResolver(botSettingsSchema),
    defaultValues: {
      botName: 'Kakarama Room Bot',
      welcomeMessage: 'Selamat datang di Kakarama Room! 🏨\n\nSilakan pilih menu di bawah ini untuk melakukan booking atau mendapatkan informasi.',
      helpMessage: 'Bantuan Kakarama Room Bot:\n\n1. Ketik "booking" untuk melakukan reservasi\n2. Ketik "info" untuk informasi kamar\n3. Ketik "kontak" untuk menghubungi CS\n\nJika ada pertanyaan, silakan hubungi CS kami.',
      errorMessage: 'Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi CS kami untuk bantuan.',
      responseDelay: 1,
      maxRetries: 3,
      sessionTimeout: 30,
      enableLogging: true,
      enableAnalytics: true,
      maintenanceMode: false,
      autoReply: true
    }
  })

  const maintenanceMode = watch('maintenanceMode')

  const handleFormSubmit = async (data: BotSettingsData) => {
    try {
      await onSave(data)
      toast.success('Bot settings saved successfully')
    } catch (error) {
      toast.error('Failed to save bot settings')
    }
  }

  const handleReset = () => {
    reset()
    toast.success('Settings reset to default values')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span>Bot Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure WhatsApp bot behavior and responses
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Settings</h3>
            
            <Input
              {...register('botName')}
              label="Bot Name"
              placeholder="Kakarama Room Bot"
              leftIcon={<Bot className="h-4 w-4" />}
              error={errors.botName?.message}
              disabled={isLoading || isSubmitting}
              required
            />
          </div>

          {/* Messages */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Bot Messages</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Welcome Message <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('welcomeMessage')}
                placeholder="Enter welcome message..."
                className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isSubmitting}
              />
              {errors.welcomeMessage && (
                <p className="text-sm text-red-500">{errors.welcomeMessage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Help Message <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('helpMessage')}
                placeholder="Enter help message..."
                className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isSubmitting}
              />
              {errors.helpMessage && (
                <p className="text-sm text-red-500">{errors.helpMessage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Error Message <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('errorMessage')}
                placeholder="Enter error message..."
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isSubmitting}
              />
              {errors.errorMessage && (
                <p className="text-sm text-red-500">{errors.errorMessage.message}</p>
              )}
            </div>
          </div>

          {/* Performance Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Performance Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                {...register('responseDelay', { valueAsNumber: true })}
                type="number"
                label="Response Delay (seconds)"
                placeholder="1"
                leftIcon={<Clock className="h-4 w-4" />}
                error={errors.responseDelay?.message}
                disabled={isLoading || isSubmitting}
                helperText="Delay before sending responses"
                min={0}
                max={10}
                step={0.1}
                required
              />

              <Input
                {...register('maxRetries', { valueAsNumber: true })}
                type="number"
                label="Max Retries"
                placeholder="3"
                error={errors.maxRetries?.message}
                disabled={isLoading || isSubmitting}
                helperText="Maximum retry attempts"
                min={1}
                max={5}
                required
              />

              <Input
                {...register('sessionTimeout', { valueAsNumber: true })}
                type="number"
                label="Session Timeout (minutes)"
                placeholder="30"
                leftIcon={<Clock className="h-4 w-4" />}
                error={errors.sessionTimeout?.message}
                disabled={isLoading || isSubmitting}
                helperText="User session timeout"
                min={5}
                max={120}
                required
              />
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Feature Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Enable Logging</h4>
                  <p className="text-sm text-gray-600">Log all bot interactions and errors</p>
                </div>
                <input
                  {...register('enableLogging')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Enable Analytics</h4>
                  <p className="text-sm text-gray-600">Track user interactions and performance metrics</p>
                </div>
                <input
                  {...register('enableAnalytics')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Auto Reply</h4>
                  <p className="text-sm text-gray-600">Automatically respond to common messages</p>
                </div>
                <input
                  {...register('autoReply')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="text-sm font-medium text-red-900 flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Maintenance Mode</span>
                  </h4>
                  <p className="text-sm text-red-700">Disable bot responses (emergency use only)</p>
                </div>
                <input
                  {...register('maintenanceMode')}
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  disabled={isLoading || isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Maintenance Warning */}
          {maintenanceMode && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="text-sm font-medium text-red-900">Warning: Maintenance Mode Enabled</h4>
              </div>
              <p className="text-sm text-red-700 mt-2">
                The bot will not respond to any messages while maintenance mode is active. 
                This should only be used during system maintenance or emergencies.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || isSubmitting || !isDirty}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Reset to Default
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button
                type="submit"
                loading={isLoading || isSubmitting}
                disabled={isLoading || isSubmitting || !isDirty}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default BotSettings
