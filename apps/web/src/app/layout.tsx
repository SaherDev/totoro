import { Providers } from './providers';
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
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
