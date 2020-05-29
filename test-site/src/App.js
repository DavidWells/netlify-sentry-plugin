import React from 'react'
import './App.css'
const { promisify, inspect } = require('util')

function throwException() {
  console.log(inspect(process.env, { showHidden: false, depth: null }))
  throw new Error('Exception on purpose')
}

export default function App() {
  return (
    <div className="App">
      <h1>Test site .........a.test...test..d...........1.0.3mixedvars..fromnpm</h1>
      <button onClick={throwException}>Break the world</button>
    </div>
  )
}
