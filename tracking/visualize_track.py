import os
import sys
import json
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import cv2
from matplotlib.widgets import Button, Slider
import matplotlib as mpl


def visualize_tracking_data(json_path, video_path=None, confidence_threshold=0.1):
    """
    Visualize tracking data from a JSON file and optionally overlay it on video frames.

    :param json_path: Path to the JSON file with tracking data.
    :param video_path: Path to the video file (optional, enables overlay if provided).
    :param confidence_threshold: Minimum confidence score to display objects (default 0.1).
    """
    # Load tracking data from JSON
    with open(json_path, 'r') as json_file:
        tracking_data = json.load(json_file)

    # Known classes and assigned distinct colors
    known_classes = [0, 1, 2, 3]  # Replace with actual class IDs
    class_colors = {cls: plt.cm.tab10(i / len(known_classes)) for i, cls in enumerate(known_classes)}

    # Initialize video capture if video path is provided
    cap = cv2.VideoCapture(video_path) if video_path else None
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Create figure and axis
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_facecolor('black')

    # Frame index tracking
    current_frame = {"index": 7200}

    def update_plot():
        """Update the plot for the current frame."""
        ax.clear()  # Clear previous plot
        ax.set_facecolor('black')  # Reset background color

        frame_idx = current_frame["index"]
        frame_info = tracking_data[frame_idx]

        # Read video frame for overlay (if enabled)
        frame = None
        if cap:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)  # Set video to current frame
            ret, frame = cap.read()
            if not ret:
                print("Failed to read video frame.")
                return

        ax.text(
                5,10,  # Offset text position slightly
                f"object count: {len(frame_info['objects'])}",
                color='white',
                fontsize=8,
                bbox=dict(facecolor='black', alpha=0.7, edgecolor='none', pad=1)
            )
        
        
        # Plot objects in the current frame
        for obj in frame_info["objects"]:

            class_id = obj["class_id"]
            center = obj["center"]
            track_id = obj.get("track_id", "N/A")  # Get track ID or default to "N/A"

            if obj["confidence"] < confidence_threshold:
                continue
            

            # Plot center of the bounding box with a white contour
            color = class_colors.get(class_id, 'white')  # Default to white if class is unknown
            ax.scatter(
                center[0], center[1],
                color=color,         # Fill color
                edgecolors='white',  # White contour
                linewidth=1.5,       # Thickness of the contour
                s=50,               # Size of the marker
                label=f"Class {class_id}" if frame_idx == 0 else ""
            )

            # Annotate track ID near the detection point
            ax.text(
                center[0]-7, center[1] - 5,  # Offset text position slightly
                f"ID: {track_id}",
                color='white',
                fontsize=8,
                bbox=dict(facecolor='black', alpha=0.7, edgecolor='none', pad=1)
            )

        # Add a transparent overlay of the video frame (if enabled)
        if frame is not None:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            ax.imshow(frame_rgb, alpha=0.9, extent=[0, frame.shape[1], frame.shape[0], 0])

        # Add legend with distinct class labels only
        handles = [mpatches.Patch(color=color, label=f"Class {cls}") for cls, color in class_colors.items() if any(obj["class_id"] == cls for obj in frame_info["objects"])]
        ax.legend(handles=handles, loc='upper right', facecolor='white', edgecolor='black')

        # Set plot title and labels
        ax.set_title(f"Frame {frame_idx + 1}/{len(tracking_data)}", color='white')
        ax.set_xlabel("X", color='white')
        ax.set_ylabel("Y", color='white')
        ax.tick_params(axis='both', colors='white')

        # Redraw the figure
        plt.draw()

    def next_frame(event=None):
        """Navigate to the next frame."""
        current_frame["index"] = (current_frame["index"] + 1) % (min(total_frames, len(tracking_data)))
        update_plot()
        slider.set_val(current_frame["index"])  # Sync slider with navigation

    def prev_frame(event=None):
        """Navigate to the previous frame."""
        current_frame["index"] = (current_frame["index"] - 1) % (min(total_frames, len(tracking_data)))
        update_plot()
        slider.set_val(current_frame["index"])  # Sync slider with navigation

    def on_slider_change(val):
        """Handle slider change events."""
        current_frame["index"] = int(val)
        update_plot()

    # Create navigation buttons
    ax_prev = plt.axes([0.7, 0.01, 0.1, 0.05])  # Position: [left, bottom, width, height]
    ax_next = plt.axes([0.81, 0.01, 0.1, 0.05])

    btn_prev = Button(ax_prev, 'Back')
    btn_next = Button(ax_next, 'Next')

    btn_prev.on_clicked(prev_frame)
    btn_next.on_clicked(next_frame)

    # Create slider
    ax_slider = plt.axes([0.1, 0.01, 0.5, 0.03])  # Position: [left, bottom, width, height]
    slider = Slider(ax_slider, 'Frame', 0, (min(total_frames, len(tracking_data))) - 1, valinit=7200, valstep=1)
    slider.on_changed(on_slider_change)

    # Display the first frame
    update_plot()
    plt.show()

    if cap:
        cap.release()


if __name__ == "__main__":
    if len(sys.argv) < 2 or len(sys.argv) > 4:
        print(f"Usage: python {sys.argv[0]} <jsonname> <videoname> [confidence_threshold]")
        sys.exit(1)

    jsonname = sys.argv[1]
    videoname = sys.argv[2]
    confidence_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0

    json_path = os.path.join('json_output', jsonname)
    video_path = os.path.join('input_videos', videoname)

    visualize_tracking_data(json_path, video_path, confidence_threshold)
