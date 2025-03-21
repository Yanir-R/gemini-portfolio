# FastAPI Gemini AI Backend

This is a FastAPI backend service that integrates with Google's Gemini AI API to generate responses based on user input.

## Prerequisites

-   Python 3.8 or higher
-   pip (Python package installer)
-   A Gemini API key from Google

### Required Libraries

-   fastapi: For creating the REST API
-   uvicorn: ASGI server implementation
-   python-dotenv: For loading environment variables
-   google-genai: Google's Generative AI library for Gemini
-   pydantic: For data validation

### Installation

You can install all required packages using either:

```bash
pip3 install -r requirements.txt
```

Or install individually:

```bash
pip3 install -q -U google-genai
pip3 install fastapi uvicorn python-dotenv pydantic
```

## Setup Instructions

### 1. Create and Activate Virtual Environment

For macOS/Linux:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

For Windows:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
.\venv\Scripts\activate
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
touch .env
```

Add your Gemini API key to the `.env` file:

### 4. Running the Server

Start the FastAPI server with hot reload:

```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## API Endpoints

### Health Check

-   GET `/`
-   Returns a message confirming the API is running

### Generate Text

-   POST `/generate-text`
-   Request body:
    ```json
    {
    	"message": "Your message here"
    }
    ```
-   Returns:
    ```json
    {
    	"response": "AI-generated response"
    }
    ```

## Development

To stop the server, press `CTRL+C` in the terminal.

To deactivate the virtual environment:

```bash
deactivate
```

## Project Structure

-   `main.py`: Main FastAPI application file
-   `gemini_helper.py`: Helper functions for Gemini API integration
-   `.env`: Environment variables file
-   `requirements.txt`: List of dependencies
