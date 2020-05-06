import React from 'react'
import './App.css'

function throwException() {
  console.log(nothing);
}

export default function App() {
  return (
    <div className="App">
      <h1>Test site</h1>
      <button onClick={throwException}>Break the world</button>
    </div>
  )
}
