import { getDashboardData } from './actions/dashboard'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  // Puxa os dados consolidados do Supabase rodando do lado do servidor
  const data = await getDashboardData()

  // Passa para o client-component que irá lidar com realtime
  return <DashboardClient initialData={data} />
}
