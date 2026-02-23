import { Divider } from '@blueprintjs/core';
import React from 'react';
import linkedInThumb from '../assets/linkedInThumb.jpeg'; // Adjust the import path if necessary

const AboutPage: React.FC = () => {
  return (
    <div>
      <h1>About This App</h1>
      <p>
        Built by{' '}
        <a
          href="https://www.linkedin.com/in/david-savage-6b7a1b109/"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          David Savage
        </a>
      </p>
      <img src={linkedInThumb} alt="LinkedIn Thumbnail" style={styles.image} />
      <p>
      This guy.
      </p>

      <p>Follow me on github!{' '}<a
          href="https://github.com/LikeTheWolf"
          target="_blank"
          rel="noopener noreferrer"
         
        >
          LikeTheWolf
        </a>
      </p>

      <Divider />

    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center' as 'center',
    padding: '20px',
  },
  image: {
    margin: '20px 0',
    maxWidth: '100%',
    height: 'auto',
  },
  link: {
    color: '#0077b5',
    textDecoration: 'none',
  },
};

export default AboutPage;