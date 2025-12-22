import { useEffect } from "react"
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"

function App() {
  useEffect(() => {
    // Initialize the database with default data on app load
    const initializeData = async () => {
      try {
        await fetch('/api/init', { method: 'POST' })
      } catch (error) {
      }
    }
    initializeData()
  }, [])

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App