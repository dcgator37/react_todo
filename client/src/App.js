import React from 'react';
import logo from './logo.svg';
import './App.css';
import { TextEncoder, TextDecoder } from 'util'
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router';
import Todo from './Todo';

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          <Link to="/">Home</Link>
          <Link to="/otherpage">Other Page</Link>
        </header>
        <div>
          <Routes>
            <Route path="/" element={<Todo />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
