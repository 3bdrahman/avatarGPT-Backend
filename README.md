#  AvatarView Backend Project
This documentation provides an overview of the backend project, including the server and routes configuration. 
Frontend project: <a href="https://github.com/3bdrahman/ava_frontend">here</a>

### Backend structure
The backend project in majority consists of:
- `server.js`: The main entry point of the backend server.
- `routes/openai.js`: Defines audio-related routes for speech-to-text conversion & emits response data sent by Microsoft-speech-SDK

  ## Key functionalities of `server.js`:
  - Creates an Express application and  an HTTP server.
  - Initializes Socket.IO with CORS configuration.
  - Handles Socket.IO connections and disconnections.
  - Registers OpenAI routes using the /api/openai prefix.
  - Starts the server listening on the specified port.

  ## Key functionalities of `routes/openai.js`:
  - Defines a POST route at /transcribe for audio transcription and speech generation.
  - Converts audio files to the required format for transcription.
  - Uses OpenAI API (Whisper & ChatGPT) to transcribe the audio and generate AI-based responses.
  - Generates speech output using the Microsoft Cognitive Services Speech SDK.
  - Emits viseme events and audio data via Socket.IO for real-time synchronization with the client.
