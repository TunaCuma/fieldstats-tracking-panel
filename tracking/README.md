# Object Tracking System Documentation

This documentation covers the object tracking system implemented in the provided code files. The system uses ByteTrack for tracking objects across video frames, provides visualization capabilities, and exposes an API endpoint for updating tracking information.

## System Overview

The tracking system consists of three main components:

1. **Tracker Module (`tracker.py`)**: Core tracking functionality using ByteTrack algorithm
2. **Visualization Tool (`visualize_tracking_data.py`)**: For viewing tracking results overlaid on video
3. **API Server (`app.py`)**: Flask application that exposes tracking functionality via HTTP

The system reads detection data from a JSON file (`radon.json`) and processes it to track objects across frames.

## Installation Requirements

```bash
# At the project route
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## File Structure

```
.
├── app.py                # Flask API server
├── tracker.py            # Core tracking functionality (from paste.txt)
├── visualize.py          # Visualization tool (from paste-2.txt)
├── radon.json            # Input detection data (required)
├── json_output/          # Directory for tracking output
└── input_videos/         # Directory for input videos
```

## Core Concepts

- **Frame**: A single image from a video sequence
- **Detection**: An object detected in a frame (with bounding box/center coordinates)
- **Track**: A detected object that is tracked across multiple frames with a consistent ID
- **Chunk**: A sequence of frames processed together (default: 1800 frames for 30 seconds)

## Using the Tracker API

### Starting the API Server

```bash
python tracking/app.py
```

This starts a Flask server on `http://localhost:5000`.

### API Endpoint: Update Tracking

**Endpoint**: `POST /update`

**Request Format**:

```json
{
  "frame_id": 7200,
  "coord_id": {
    "[320.5, 240.7]": 1,
    "[420.1, 350.2]": 2
  }
}
```

- `frame_id`: The starting frame index to process
- `coord_id`: A mapping from object coordinates (as string) to track IDs

**Response Format**:

```json
{
    "lost_frame_id": 7350,
    "lost_ids": [2],
    "tracks": [
        {
            "frame_index": 7200,
            "objects": [
                {
                    "track_id": 1,
                    "class_id": 0,
                    "confidence": 0.95,
                    "bbox": [318.0, 238.2, 323.0, 243.2],
                    "center": [320.5, 240.7]
                },
                ...
            ]
        },
        ...
    ]
}
```

- `lost_frame_id`: The frame ID where a track was lost (if any)
- `lost_ids`: Array of track IDs that were lost
- `tracks`: Array of frames with tracking data

### Example API Usage with Python

```python
import requests
import json

# Prepare payload
payload = {
    "frame_id": 7200,
    "coord_id": {
        "[320.5, 240.7]": 1,
        "[420.1, 350.2]": 2
    }
}

# Send request
response = requests.post('http://localhost:5000/update', json=payload)

# Process response
if response.status_code == 200:
    result = response.json()
    print(f"Processing completed until frame {result['lost_frame_id']}")
    print(f"Lost track IDs: {result['lost_ids']}")
    print(f"Total frames processed: {len(result['tracks'])}")
else:
    print(f"Error: {response.text}")
```

## Visualizing Tracking Results

You can visualize the tracking results using the visualization tool:

```bash
python visualize.py <json_file> <video_file> [confidence_threshold]
```

For example:

```bash
python visualize.py tracking_result.json game.mp4 0.2
```

The visualization provides:

- Object positions with class-colored markers
- Track IDs for each object
- Navigation controls (Next/Back buttons and a slider)
- Object count display

## How the Tracker Works

1. **Initial Setup**: The system starts with an initial frame and coordinates-to-ID mapping
2. **Data Loading**: Loads detection data from `radon.json`
3. **Matching**: Maps object coordinates to track IDs at the start frame
4. **Tracking**: Uses ByteTrack to track objects across frames with consistent IDs
5. **ID Management**: Maintains active tracks and reuses IDs when appropriate
6. **Lost Track Detection**: Identifies when tracks are lost and reports them

### Key Parameters

- `CHUNK_LENGTH`: Number of frames to process in each update (default: 1800)
- Track parameters in `perform_tracking_from_json()`:
  - `track_activation_threshold`: 0.1
  - `minimum_matching_threshold`: 0.98
  - `lost_track_buffer`: 10
  - `frame_rate`: 59
  - `minimum_consecutive_frames`: 1

## Troubleshooting

### Common Issues:

1. **Missing `radon.json`**: Ensure this file exists and contains proper detection data
2. **Incorrect coordinate format**: Ensure coordinates are formatted as arrays, e.g., `[320.5, 240.7]`
3. **Frame not found**: Verify that the requested `frame_id` exists in the `radon.json` file
4. **Track matching issues**: Adjust the distance threshold (28 by default) if tracks are not being matched correctly

### Debugging Tips:

- Check the console output for detailed tracking logs
- Use the visualization tool to inspect tracking results
- Modify confidence thresholds if objects are not being tracked properly

## Advanced Usage

### Customizing ByteTrack Parameters

You can modify tracking parameters in the `perform_tracking_from_json()` function:

```python
tracker = sv.ByteTrack(
    track_activation_threshold=0.1,  # Increase for higher confidence
    minimum_matching_threshold=0.98, # Decrease for more lenient matching
    lost_track_buffer=10,           # Increase to keep lost tracks longer
    frame_rate=59,                  # Set to match your video frame rate
    minimum_consecutive_frames=1    # Increase for more stable tracks
)
```

### Processing Multiple Video Sources

The tracking system supports multiple sources (e.g., "right" and "left" cameras). Detections from different sources are merged with appropriate coordinate adjustments.
