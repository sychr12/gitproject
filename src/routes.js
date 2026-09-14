import React from 'react';
import {BrowserRouter, Routes as RouterRoutes, Route} from 'react-router-dom';

import Main from './pages/Main';
import Repositorio from './pages/Repositorio';

export default function Routes(){
  return(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouterRoutes>
        <Route path="/" element={<Main />} />
        <Route path="/repositorio/:repositorio" element={<Repositorio />} />
      </RouterRoutes>
    </BrowserRouter>
  );
}
