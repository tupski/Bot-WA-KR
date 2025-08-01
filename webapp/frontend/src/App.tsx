import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Placeholder components - will be created in later tasks
function LoginPage() {
  return <div className="p-8">Login Page - To be implemented</div>
}

function DashboardPage() {
  return <div className="p-8">Dashboard Page - To be implemented</div>
}

function TransactionsPage() {
  return <div className="p-8">Transactions Page - To be implemented</div>
}

function ReportsPage() {
  return <div className="p-8">Reports Page - To be implemented</div>
}

function CSPage() {
  return <div className="p-8">CS Page - To be implemented</div>
}

function ConfigPage() {
  return <div className="p-8">Config Page - To be implemented</div>
}

function LogsPage() {
  return <div className="p-8">Logs Page - To be implemented</div>
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/cs" element={<CSPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
