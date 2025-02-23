// src/renderer/App.tsx
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './components/HomeScreen';
import { MainUI } from './components/MainUI';
import './styles/global.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/main" element={<MainUI />} />
      </Routes>
    </Router>
  );
}
