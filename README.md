# Gemini AI Chat Application

A full-stack chat application built with React TypeScript frontend and FastAPI backend, integrated with Google's Gemini AI API.

## Project Structure

## Prerequisites

### Frontend Requirements

-   Node.js (v14.0.0 or higher)
-   npm (v6.0.0 or higher)

### Backend Requirements

-   Python 3.8 or higher
-   pip (Python package installer)
-   A Gemini API key from Google

## Quick Start

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip3 install -r requirements.txt

# Create .env file and add your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the server
uvicorn main:app --reload
```

The backend API will be available at `http://localhost:8000`

## Features

-   Real-time chat interface
-   Integration with Google's Gemini AI
-   RESTful API endpoints
-   TypeScript support
-   Fast and efficient FastAPI backend

## API Endpoints

-   `GET /`: Health check endpoint
-   `POST /generate-text`: Generate AI response
    ```json
    {
    	"message": "Your message here"
    }
    ```

## Development

### Frontend Development

The frontend is built with:

-   React
-   TypeScript
-   Vite
-   Axios for API calls

### Backend Development

The backend utilizes:

-   FastAPI
-   Python
-   Gemini AI API
-   Pydantic for data validation

## License

[Your License Here]

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
