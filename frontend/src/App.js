import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import Sessions from './components/Sessions';
import Channels from './components/Channels';
import Files from './components/Files';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <div className="container-fluid mt-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/files" element={<Files />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;