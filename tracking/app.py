from flask import Flask, request, jsonify
import tracker  # Your tracker module with the update function

app = Flask(__name__)

@app.route('/update', methods=['POST'])
def update_endpoint():
    # Get JSON data from the request body
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON payload provided'}), 400

    # Extract the expected fields
    coord_id = data.get('coord_id')
    frame_id = data.get('frame_id')
    
    # Validate the received data
    if coord_id is None or frame_id is None:
        return jsonify({'error': 'Missing one or more required parameters: coord_id, frame_id'}), 400

    try:
        # Call the update function from tracker. It is assumed to return:
        # (lost_frame_id, lost_ids, tracking_response)
        lost_frame_id, lost_ids, tracking_response = tracker.update(frame_id, coord_id)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    # If tracking_response is a Flask Response, we extract its JSON content.
    if hasattr(tracking_response, 'get_json'):
        tracks = tracking_response.get_json()
    else:
        tracks = tracking_response

    # Return the combined response
    return jsonify({
        'lost_frame_id': lost_frame_id,
        'tracks': tracks,
        'lost_ids': lost_ids
    })

if __name__ == '__main__':
    app.run(debug=True)
