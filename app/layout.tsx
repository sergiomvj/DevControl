import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FBR Dev Control Dashboard',
  description: 'FBR Development Control — real-time project and issue tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
