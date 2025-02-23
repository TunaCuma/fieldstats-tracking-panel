// src/renderer/components/MainUI.tsx
import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { VideoPlayer } from './VideoPlayer';

export interface Player {
  id: number;
  name: string;
  // additional fields as needed
}

// Function stubs for remote calls / Python interactions
export async function fetchPlayers(): Promise<Player[]> {
  // TODO: Replace with actual API call
  return [
    { id: 1, name: 'Player One' },
    { id: 2, name: 'Player Two' },
  ];
}

export async function generateTrackingSegment(): Promise<void> {
  // TODO: Integrate with Python (Flask) service
}

export async function updateLongInterpolation(): Promise<void> {
  // TODO: Integrate with Python (Flask) service
}

export function MainUI(): ReactElement {
  const [players, setPlayers] = useState<Player[]>([]);
  const [yoloData, setYoloData] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    const loadPlayers = async (): Promise<void> => {
      const playersData = await fetchPlayers();
      setPlayers(playersData);
    };
    loadPlayers();

    // For testing: load dummy YOLO data (replace with file load logic)
    const dummyYoloData = [
      {
        frame_index: 0,
        objects: [
          {
            class_id: 2,
            confidence: 0.89,
            bbox: [100, 100, 150, 150],
            center: [125, 125],
            color: 'blue',
            source: 'left',
            transformed_center: [200, 200],
            id: 101,
          },
        ],
      },
      // ... more frames as needed
    ];
    setYoloData(dummyYoloData);
  }, []);

  const handleBoxClick = (object: any): void => {
    // TODO: Implement UI logic for player assignment.
    if (object && object.id) {
      setSelectedUserIds((prev) => [...prev, object.id]);
    }
  };

  const handleInitPlayers = (): void => {
    // TODO: Open a modal or selection panel to let the employee select players.
  };

  const handleGenerateTracking = async (): Promise<void> => {
    await generateTrackingSegment();
    // TODO: Update UI state accordingly after generating tracking.
  };

  const handleUpdateInterpolation = async (): Promise<void> => {
    await updateLongInterpolation();
    // TODO: Update UI state accordingly after updating interpolation.
  };

  return (
    <div className="p-4 bg-white h-screen overflow-auto">
      <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Main UI</h1>
          <p className="text-sm text-gray-600">
            Players loaded: {players.length}
          </p>
          <p className="text-sm text-gray-600">
            Selected Player IDs:{' '}
            {selectedUserIds.length > 0 ? selectedUserIds.join(', ') : 'None'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleInitPlayers}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded mt-4 sm:mt-0"
        >
          Initialize Players
        </button>
      </header>
      <div className="grid grid-cols-1 gap-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Field Left</h2>
          <VideoPlayer
            src="field_left.mp4"
            yoloData={yoloData}
            onBoxClick={handleBoxClick}
          />
        </div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Field Right</h2>
          <VideoPlayer
            src="field_right.mp4"
            yoloData={yoloData}
            onBoxClick={handleBoxClick}
          />
        </div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Generated Topdown</h2>
          <VideoPlayer
            src="generated_topdown.mp4"
            yoloData={yoloData}
            onBoxClick={handleBoxClick}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          type="button"
          onClick={handleGenerateTracking}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Generate 30s Tracking
        </button>
        <button
          type="button"
          onClick={handleUpdateInterpolation}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Update Interpolations
        </button>
      </div>
    </div>
  );
}

export default MainUI;
