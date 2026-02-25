import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/table/lib/css/table.css";

import { Alignment, Button, Navbar, NavbarDivider, NavbarGroup, NavbarHeading } from '@blueprintjs/core';
import React from 'react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';

import AboutPage from "./pages/About";
import UploadPage from "./pages/UploadPage";

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-shell">
        <Navbar className="app-navbar">
          <NavbarGroup align={Alignment.LEFT}>
            <NavbarHeading>Upload QA Lab</NavbarHeading>
            <NavbarDivider />
            <Link to="/"><Button minimal icon="cloud-upload" text="Upload Dashboard" /></Link>
            <Link to="/about"><Button minimal icon="info-sign" text="About" /></Link>
          </NavbarGroup>
        </Navbar>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
