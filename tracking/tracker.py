import json
import os
import sys
from flask import jsonify
import supervision as sv  # Includes ByteTrack implementation
import matplotlib.pyplot as plt  # For plotting
import numpy as np
import ast


CHUNK_LENGTH = 1800

def update(start_frame, coord_ids):
    """
    Update the start mapping based on coord_ids, filter the JSON data,
    and then perform tracking with the filtered data.
    
    :param start_frame: The frame index from which to start processing.
    :param coord_ids: A dictionary mapping 2D coordinate arrays (or string representations of them)
                      to an integer id.
    :return: A tuple (frame_index, lost_ids, tracking_result) where tracking_result
             is a Flask JSON response.
    """
    # Load original JSON from disk
    with open("radon.json", "r") as f:
        input_data = json.load(f)

    # Find the start frame data
    start_frame_data = next((frame for frame in input_data if frame.get("frame_index") == start_frame), None)
    if start_frame_data is None:
        raise ValueError(f"Start frame {start_frame} not found in radon.json")

    # Create start_map: mapping from object index in the start frame to the assigned id
    start_map = {}  # {object_index: assigned_id}
    objects = start_frame_data.get("objects", [])

    # For each provided coordinate-to-id mapping in coord_ids:
    # The keys might be a list/tuple or a string representation, so we ensure conversion.
    for coord, assigned_id in coord_ids.items():
        # If coord is a string, parse it into a list of floats
        if isinstance(coord, str):
            try:
                coord_parsed = ast.literal_eval(coord)
            except Exception as e:
                raise ValueError(f"Invalid coordinate format: {coord}") from e
        else:
            coord_parsed = coord
        
        # Convert the coordinate into a tuple for comparison
        coord_tuple = tuple(coord_parsed)
        match_found = False

        for idx, obj in enumerate(objects):
            transformed_center = obj.get("transformed_center")
            if transformed_center is not None:
                # If transformed_center is a list, convert it to a tuple
                if isinstance(transformed_center, list):
                    transformed_center = tuple(transformed_center)
                # Use np.allclose to compare with a small tolerance
                if np.allclose(transformed_center, coord_tuple, atol=1e-2):
                    start_map[idx] = assigned_id
                    match_found = True
                    break

        if not match_found:
            # No matching object found: add a new object with default values
            new_object = {
                "transformed_center": list(coord_tuple),
                "source": "unknown",
                "confidence": 1.0,
                "team_index": assigned_id
            }
            new_index = len(objects)
            objects.append(new_object)
            start_map[new_index] = assigned_id

    # Filter the JSON data to include only frames in the desired range
    filtered_data = [frame for frame in input_data 
                     if start_frame <= frame.get("frame_index", 0) < start_frame + CHUNK_LENGTH]

    # Feed the filtered JSON data (in-memory) along with the start_map to the tracker
    return perform_tracking_from_json(filtered_data, start_frame, start_map)

def perform_tracking_from_json(input_data, start_frame, start_map):
    """
    Perform tracking using ByteTrack based on bounding box information from input_data.
    
    :param input_data: List of frame detection dictionaries.
    :param start_frame: The starting frame index.
    :param start_map: Mapping from start frame's object indices to an assigned id.
    :return: A tuple (last_frame_index, lost_ids, tracking_result) where tracking_result is a JSON response.
    """
    # Initialize ByteTrack
    tracker = sv.ByteTrack(
        track_activation_threshold=0.1,
        minimum_matching_threshold=0.98,
        lost_track_buffer=10,
        frame_rate=59,
        minimum_consecutive_frames=1
    )

    # Tracking management variables
    max_allowed_id = 23      # Maximum allowed internal id
    active_tracks = {}
    reusable_ids = list(range(1, max_allowed_id + 1))  # Pool of available IDs
    track_id_map = {}  # Map external track ids to internal ids
    frame_count = 0
    active_track_counts = []
    lost_tracker = [0] * 23
    lost_array = []
    tracking_data = []

    for frame_data in input_data:
        frame_count += 1
        frame_index = frame_data["frame_index"]
        detections = frame_data["objects"]

        bboxes = []
        confidences = []
        class_ids = []
        for obj in detections:
            # Adjust x coordinate for detections coming from "right" if needed
            if obj["source"] == "right":
                obj["transformed_center"][0] += 347
            bbox = [
                obj["transformed_center"][0] - 2.5,
                obj["transformed_center"][1] - 2.5,
                obj["transformed_center"][0] + 2.5,
                obj["transformed_center"][1] + 2.5
            ]
            bboxes.append(bbox)
            class_ids.append(obj.get("team_index", -1))
            confidences.append(obj["confidence"])

        if bboxes:
            bboxes = np.array(bboxes, dtype=np.float32)
        else:
            bboxes = np.empty((0, 4), dtype=np.float32)

        detection_supervision = sv.Detections(
            xyxy=bboxes,
            confidence=np.array(confidences, dtype=np.float32),
            class_id=np.array(class_ids, dtype=np.int32)
        )

        tracked_objects = tracker.update_with_detections(detection_supervision)
        frame_tracking_data = {"frame_index": frame_index, "objects": []}

        for index, track in enumerate(tracked_objects):
            bbox = track[0].tolist()
            confidence = track[2]
            class_id = track[3]
            center_x = (bbox[0] + bbox[2]) / 2
            center_y = (bbox[1] + bbox[3]) / 2

            external_id = track[4]
            if external_id not in track_id_map:
                if reusable_ids:
                    distances = []
                    for internal_id in reusable_ids:
                        if internal_id in active_tracks:
                            if class_id == active_tracks[internal_id]["cls_id"]:
                                prev_center = active_tracks[internal_id]["center"]
                                distance_delta = np.sqrt((center_x - prev_center[0]) ** 2 +
                                                         (center_y - prev_center[1]) ** 2)
                                distances.append((internal_id, distance_delta))
                        else:
                            # For detections in the start frame, try to use forced id from start_map if available
                            if frame_index == start_frame and index in start_map:
                                forced_internal_id = start_map[index]
                                for internal_id in reusable_ids:
                                    if internal_id == forced_internal_id:
                                        distances.append((internal_id, 0))
                                    else:
                                        distances.append((internal_id, float('inf')))
                            else:
                                distances.append((internal_id, 0))
                    if len(distances) == 0:
                        continue
                    min_id, min_distance = min(distances, key=lambda x: x[1])
                    if min_distance > 28:  # Threshold for matching distance
                        continue
                    internal_id = min_id
                    reusable_ids.remove(internal_id)
                    print("Put,", internal_id, ",at frame", frame_index, f"with distance={min_distance}")
                    track_id_map[external_id] = internal_id
                    active_tracks[internal_id] = {
                        "frame_count": frame_count,
                        "center": [center_x, center_y],
                        "cls_id": class_id,
                        "active": True
                    }
                else:
                    continue
            else:
                internal_id = track_id_map[external_id]
                active_tracks[internal_id]["frame_count"] = frame_count
                active_tracks[internal_id]["center"] = [center_x, center_y]
                if class_id != active_tracks[internal_id]["cls_id"]:
                    active_tracks[internal_id]["active"] = False

            frame_tracking_data["objects"].append({
                "track_id": int(internal_id),
                "class_id": int(active_tracks[internal_id]["cls_id"]),
                "confidence": float(confidence),
                "bbox": list(map(float, bbox)),
                "center": list(map(float, [center_x, center_y])),
            })

        # Manage lost tracks and update reusable ids
        for internal_id, data in list(active_tracks.items()):
            lost = False
            if not data["active"]:
                if internal_id not in reusable_ids:
                    lost = True
            elif frame_count - data["frame_count"] > 10:
                lost = True

            if lost:
                print("Lost", internal_id, "at frame", frame_index)
                active_tracks[internal_id]["active"] = False
                reusable_ids.append(internal_id)
                external_ids_to_remove = [k for k, v in track_id_map.items() if v == internal_id]
                for ext_id in external_ids_to_remove:
                    del track_id_map[ext_id]

        for i in range(23):
            if (i+1) in active_tracks and not active_tracks[i+1]["active"]:
                lost_tracker[i] += 1
                if lost_tracker[i] > 60:
                    print("Lost for 1 second, index=", i+1, "at frame", frame_index)
                    lost_array.append(i+1)
            else:
                lost_tracker[i] = 0

        tracking_data.append(frame_tracking_data)
        if len(lost_array) > 0:
            return frame_index, lost_array, jsonify(tracking_data)

        current_active_count = sum(1 for track in active_tracks.values() if track["active"])
        active_track_counts.append((frame_index, current_active_count))

    return frame_index, lost_array, jsonify(tracking_data)

