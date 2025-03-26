FROM python:3.9-slim

WORKDIR /app

# Upgrade pip and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create docs structure
RUN mkdir -p /app/docs/private /app/docs/templates

# Copy application files including docs
COPY docs/ /app/docs/
COPY . .

# Expose port 8080
EXPOSE 8080

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--worker-class", "uvicorn.workers.UvicornWorker", "main:app"] 