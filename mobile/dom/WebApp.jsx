"use dom";

import React from 'react';
import { HashRouter } from 'react-router-dom';

import MobileApp from './MobileApp';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { SessionProvider } from '../../src/context/SessionContext';
import '../../src/index.css';

export default function WebApp() {
  return (
    <HashRouter>
      <ThemeProvider>
        <SessionProvider>
          <MobileApp />
        </SessionProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
