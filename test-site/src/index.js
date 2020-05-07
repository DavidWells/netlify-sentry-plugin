import React from 'react'
import ReactDOM from 'react-dom'
import * as Sentry from '@sentry/browser';

import App from './App'
import './index.css'

Sentry.init({
  dsn: "https://f0ebf5ae270842abbe2dc1b441bed3d9@o328915.ingest.sentry.io/5225138",
  release: process.env.COMMIT_REF,
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
