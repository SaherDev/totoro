import { ClerkProvider } from '@clerk/nextjs';
import './global.css';

export const metadata = {
  title: 'Totoro - AI Place Recommendations',
  description: 'An AI-native place decision engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
