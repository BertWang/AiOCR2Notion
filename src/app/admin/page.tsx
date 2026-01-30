import { AdminPanel } from '@/components/admin-panel'

export const dynamic = 'force-dynamic'

export default function AdminPage(){
  return (
    <div className="p-8">
      <h1 className="text-2xl font-serif mb-4">管理控制台</h1>
      <AdminPanel />
    </div>
  )
}
