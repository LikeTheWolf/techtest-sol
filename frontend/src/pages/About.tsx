import { Card, Divider, Elevation } from '@blueprintjs/core';
import React from 'react';
import linkedInThumb from '../assets/linkedInThumb.jpeg';

const AboutPage: React.FC = () => {
  return (
    <div className="about-page">
      <Card elevation={Elevation.TWO} className="about-card">
        <h1>About This App</h1>

        <p>
          Built by{' '}
          <a
            href="https://www.linkedin.com/in/david-savage-6b7a1b109/"
            target="_blank"
            rel="noopener noreferrer"
            className="about-link"
          >
            David Savage
          </a>
        </p>

        <img src={linkedInThumb} alt="LinkedIn Thumbnail" className="about-image" />

        <p>This guy.</p>

        <Divider />

        <p>
          Follow me on github!{' '}
          <a
            href="https://github.com/LikeTheWolf"
            target="_blank"
            rel="noopener noreferrer"
            className="about-link"
          >
            LikeTheWolf
          </a>
        </p>
      </Card>
    </div>
  );
};

export default AboutPage;
