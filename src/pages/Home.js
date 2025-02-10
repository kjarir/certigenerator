import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';

const Home = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: '#fff'
    }}>
      {/* Spline 3D Scene */}
      <Spline 
        scene="https://prod.spline.design/jclca1kRYXiMPXsO/scene.splinecode"
        style={{
          width: '100%',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }}
      />

      {/* Centered Button */}
      <div style={{
        background: 'transparent',
        position: 'fixed',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <motion.div
          whileHover={{ 
            scale: 1.1,
            // boxShadow: '0 0 25px rgba(147, 51, 234, 0.5)'
          }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 400,
            damping: 10
          }}
        >
          <Link 
            to="/get-started"
            style={{
              padding: '1rem 3rem',
              fontSize: '1.5rem',
              borderRadius: '50px',
              background: 'transparent',
              border: '2px solid #000',
              backdropFilter: 'blur(10px)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: 'bold',
              color: '#000',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.3s ease'
            }}
          >
            Get Started
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
