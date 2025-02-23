import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

interface ProjectConfig {
  name: string;
  createdAt: string;
  lastModified: string;
  version: string;
}

function getBaseName(filePath: string): string {
  const trimmedPath = filePath.trim();
  const fileName = trimmedPath.split(/[\\/]/).pop() || '';
  return fileName.replace(/\.tuna$/, '');
}

export default function HomeScreen(): ReactElement {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  const createProjectFile = async (filePath: string): Promise<void> => {
    try {
      // Create a new zip file
      const zip = new JSZip();

      const projectName = getBaseName(filePath);

      // Create project configuration
      const config: ProjectConfig = {
        name: projectName,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      // Add files to the zip
      zip.file('project.json', JSON.stringify(config, null, 2));
      zip.file(
        'README.md',
        `# ${projectName}\nCreated on ${new Date().toLocaleDateString()}`,
      );

      // Create empty directories
      zip.folder('audio');
      zip.folder('midi');
      zip.folder('video');

      // Generate zip file as Uint8Array
      const content = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      // Save the .tuna file - send Uint8Array directly
      await window.electron.ipcRenderer.invoke('write-file', {
        filePath,
        data: content, // Send Uint8Array directly through IPC
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Failed to create project: ${errMsg}`);
    }
  };

  const handleImportProject = async (): Promise<void> => {
    try {
      setErrorMessage('');

      // Show save dialog for new project
      const result = await window.electron.ipcRenderer.invoke(
        'show-save-dialog',
        {
          filters: [{ name: 'Tuna Projects', extensions: ['tuna'] }],
          properties: ['createDirectory'],
        },
      );

      if (!result || !result.filePath) {
        return;
      }

      // Ensure the file path has .tuna extension
      const filePath = result.filePath.endsWith('.tuna')
        ? result.filePath
        : `${result.filePath}.tuna`;

      // Create the project file
      await createProjectFile(filePath);

      // Navigate to main screen with the project path
      navigate('/main', { state: { projectPath: result.filePath } });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(`Failed to create project: ${errMsg}`);
    }
  };

  const handleOpenProject = async (): Promise<void> => {
    try {
      setErrorMessage('');

      const result = await window.electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          filters: [{ name: 'Tuna Projects', extensions: ['tuna'] }],
          properties: ['openFile'],
        },
      );

      if (!result || !result.filePaths?.length) {
        return;
      }

      const filePath = result.filePaths[0];

      // Read and verify the .tuna file
      try {
        const fileData = await window.electron.ipcRenderer.invoke(
          'read-file',
          filePath,
        );
        const zip = await JSZip.loadAsync(fileData);

        // Check for project.json
        const configFile = await zip.file('project.json')?.async('string');
        if (!configFile) {
          throw new Error('Invalid project file: missing project.json');
        }

        const config = JSON.parse(configFile) as ProjectConfig;
        if (!config.name || !config.version) {
          throw new Error('Invalid project configuration');
        }
      } catch (err) {
        throw new Error('Invalid or corrupted project file');
      }

      // Navigate to main screen with the project path
      navigate('/main', { state: { projectPath: filePath } });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(`Failed to open project: ${errMsg}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-8">Open a Project</h1>

      {errorMessage && (
        <div className="mb-4 text-red-500 text-sm">{errorMessage}</div>
      )}

      <div className="space-y-4 flex flex-col">
        <button
          type="button"
          onClick={handleImportProject}
          className="w-64 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create New Project
        </button>
        <button
          type="button"
          onClick={handleOpenProject}
          className="w-64 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Open Existing Project
        </button>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        Projects are saved as .tuna files
      </p>
    </div>
  );
}
