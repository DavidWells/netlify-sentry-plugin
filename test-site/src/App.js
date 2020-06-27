import React from 'react'
import './App.css'

function throwException() {
  throw new Error('Exception on purpose')
}

export default function App() {
  return (
    <div className="App">
      <h1>Example site..</h1>
      <button onClick={throwException}>Throw exception</button>
    </div>
  )
}
