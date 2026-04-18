import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Admin from './pages/Admin';
import CadastroJurado from './pages/CadastroJurado';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Admin />} />
        <Route path="/cadastro" element={<CadastroJurado />} />
      </Routes>
    </BrowserRouter>
  );
}
