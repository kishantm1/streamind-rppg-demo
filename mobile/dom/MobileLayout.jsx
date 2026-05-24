import MobileHeader from './MobileHeader'
import Navigation from '../../src/components/Layout/Navigation'
import '../../src/components/Layout/Layout.css'

export default function MobileLayout({ children }) {
  return (
    <div className="layout">
      <MobileHeader />
      <main className="layout__main">{children}</main>
      <Navigation />
    </div>
  )
}
