import AdminNav from '@/components/admin/AdminNav'

// Menú fijo para todas las páginas del administrador
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      <div className="pb-16 md:pb-0">{children}</div>
    </>
  )
}
