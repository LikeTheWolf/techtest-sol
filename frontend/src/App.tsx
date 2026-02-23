import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/table/lib/css/table.css";

import { Button, Navbar, NavbarDivider, NavbarGroup, NavbarHeading } from '@blueprintjs/core';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import React from 'react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';

import AboutPage from "./pages/About";
import UploadPage from "./pages/UploadPage";

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        {/* Blueprint.js Navbar */}
        <Navbar>
          <NavbarGroup>
            <NavbarHeading>Upload</NavbarHeading>
            <NavbarDivider />
            <Link to="/"><Button className="bp3-minimal" icon="list-detail-view" text="Ingredients" /></Link>
            <Link to="/about"><Button className="bp3-minimal" icon="info-sign" text="About" /></Link>
          </NavbarGroup>
        </Navbar>
        
        {/* React Router Routes */}
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;