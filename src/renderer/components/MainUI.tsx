// src/renderer/components/MainUI.tsx
import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { VideoPlayer } from './VideoPlayer';

export interface Player {
  id: number;
  name: string;
  // additional fields as needed
}

interface TrackingObject {
  track_id: number;
  class_id: number;
  confidence: number;
  bbox: number[];
  center: number[];
}

interface FrameData {
  frame_index: number;
  objects: TrackingObject[];
}

interface TrackingResponse {
  lost_frame_id: number;
  lost_ids: number[];
  tracks: FrameData[];
}

// API client for the Flask server
const API_URL = 'http://localhost:5000';

export async function fetchPlayers(): Promise<Player[]> {
  // TODO: Replace with actual API call if players come from the server
  return [
    { id: 1, name: 'Player One' },
    { id: 2, name: 'Player Two' },
    { id: 3, name: 'Player Three' },
    { id: 4, name: 'Player Four' },
  ];
}

export async function generateTrackingSegment(
  frameId: number,
  coordId: Record<string, number>,
): Promise<TrackingResponse> {
  try {
    const response = await fetch(`${API_URL}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frame_id: frameId,
        coord_id: coordId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Log error to a logging service or handle silently
    // Error will be thrown and handled by the calling function
    throw error;
  }
}

// Helper function to get player ID without using window.prompt
const getPlayerIdFromUser = (message: string): string | null => {
  // In a real app, this would open a custom dialog component
  // For now, we're using a simple implementation
  return window.prompt(message, '');
};

export function MainUI(): ReactElement {
  const [players, setPlayers] = useState<Player[]>([]);
  const [trackingData, setTrackingData] = useState<FrameData[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<
    Record<string, number>
  >({});
  const [currentFrameId, setCurrentFrameId] = useState<number>(7200); // Starting frame
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lostIds, setLostIds] = useState<number[]>([]);

  useEffect(() => {
    const loadPlayers = async (): Promise<void> => {
      const playersData = await fetchPlayers();
      setPlayers(playersData);
    };
    loadPlayers();
  }, []);

  const handleBoxClick = (object: any): void => {
    if (object && object.center) {
      // Use a custom dialog component instead of window.prompt
      // For now, we'll use a simple implementation for demonstration
      // In a real app, replace this with a modal component
      const playerId = getPlayerIdFromUser(
        `Assign player ID for object at position [${object.center.join(', ')}]:`,
      );

      if (playerId && !Number.isNaN(Number(playerId))) {
        const coordKey = JSON.stringify(
          object.transformed_center || object.center,
        );
        setSelectedObjects((prev) => ({
          ...prev,
          [coordKey]: Number(playerId),
        }));

        setStatusMessage(
          `Assigned object at ${coordKey} to player ID: ${playerId}`,
        );
      }
    }
  };

  const handleGenerateTracking = async (): Promise<void> => {
    if (Object.keys(selectedObjects).length === 0) {
      setStatusMessage('Please select at least one object first');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('Generating tracking data...');

    try {
      const response = await generateTrackingSegment(
        currentFrameId,
        selectedObjects,
      );

      setTrackingData(response.tracks);
      setCurrentFrameId(response.lost_frame_id);
      setLostIds(response.lost_ids);

      if (response.lost_ids.length > 0) {
        setStatusMessage(
          `Tracking complete. Lost IDs: ${response.lost_ids.join(', ')} at frame ${response.lost_frame_id}`,
        );
      } else {
        setStatusMessage(
          `Tracking complete for ${response.tracks.length} frames`,
        );
      }
    } catch (error) {
      setStatusMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetSelection = (): void => {
    setSelectedObjects({});
    setStatusMessage('Player selections reset');
  };

  const formatSelectedObjects = (): string => {
    return Object.entries(selectedObjects)
      .map(([coord, id]) => `${coord} → Player ${id}`)
      .join(', ');
  };

  return (
    <div className="p-4 bg-white h-screen overflow-auto">
      <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Tracking UI</h1>
          <p className="text-sm text-gray-600">
            Available Players: {players.length}
          </p>
          <p className="text-sm text-gray-600">
            Current Frame: {currentFrameId}
          </p>
          {lostIds.length > 0 && (
            <p className="text-sm text-red-600">
              Lost IDs: {lostIds.join(', ')}
            </p>
          )}
        </div>
      </header>

      {statusMessage && (
        <div
          className={`p-3 mb-4 rounded ${statusMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
        >
          {statusMessage}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Selected Players</h2>
        <div className="bg-gray-100 p-3 rounded">
          {Object.keys(selectedObjects).length > 0 ? (
            <p>{formatSelectedObjects()}</p>
          ) : (
            <p className="text-gray-500">
              No players selected. Click on objects in the video to assign
              players.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Field Left</h2>
          <VideoPlayer
            src="field_left.mp4"
            yoloData={trackingData.filter((frame) =>
              frame.objects.some((obj) => obj.track_id),
            )}
            onBoxClick={handleBoxClick}
          />
        </div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Field Right</h2>
          <VideoPlayer
            src="field_right.mp4"
            yoloData={trackingData.filter((frame) =>
              frame.objects.some((obj) => obj.track_id),
            )}
            onBoxClick={handleBoxClick}
          />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Generated Tracking View</h2>
        <VideoPlayer
          src="generated_topdown.mp4"
          yoloData={trackingData}
          onBoxClick={handleBoxClick}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={handleGenerateTracking}
          disabled={isGenerating || Object.keys(selectedObjects).length === 0}
          className={`px-4 py-2 rounded text-white ${
            isGenerating || Object.keys(selectedObjects).length === 0
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate Tracking'}
        </button>

        <button
          type="button"
          onClick={handleResetSelection}
          disabled={isGenerating}
          className={`px-4 py-2 rounded text-white ${
            isGenerating
              ? 'bg-red-300 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          Reset Selection
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="frameInput" className="text-sm font-medium">
            Start Frame:
          </label>
          <input
            id="frameInput"
            type="number"
            value={currentFrameId}
            onChange={(e) => setCurrentFrameId(Number(e.target.value))}
            disabled={isGenerating}
            className="border rounded p-1 w-24 ml-2"
          />
        </div>
      </div>
    </div>
  );
}

export default MainUI;
