// src/renderer/components/HomeScreen.tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomeScreen(): ReactElement {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');

  const handleImportProject = async (): Promise<void> => {
    // TODO: Prompt for files and create a new project folder with the given name.
    navigate('/main');
  };

  const handleOpenProject = async (): Promise<void> => {
    // TODO: Open an existing project folder using file dialogs.
    navigate('/main');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-8">Project Home</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="border border-gray-300 p-2 rounded mr-2"
        />
      </div>
      <div className="space-x-4">
        <button
          type="button"
          onClick={handleImportProject}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Import Project
        </button>
        <button
          type="button"
          onClick={handleOpenProject}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Open Project
        </button>
      </div>
    </div>
  );
}

export default HomeScreen;
