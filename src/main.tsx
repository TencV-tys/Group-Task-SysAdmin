import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { library } from '@fortawesome/fontawesome-svg-core'
import { 
  faChartPie, 
  faUsers, 
  faComment, 
  faBell, 
  faSignOutAlt,
  faBars,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faCrown,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons'

// Add icons to library
library.add(
  faChartPie,
  faUsers,
  faComment,
  faBell,
  faSignOutAlt,
  faBars,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faCrown,
  faExclamationCircle
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)