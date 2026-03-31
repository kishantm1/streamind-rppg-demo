import Header from './Header'
import Navigation from './Navigation'
import './Layout.css'

function Layout({ children }) {
  return (
    <div className="layout">
      <Header />
      <main className="layout__main">
        {children}
      </main>
      <Navigation />
    </div>
  )
}

export default Layout
