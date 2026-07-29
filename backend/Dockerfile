FROM python:3.12-slim

WORKDIR /app

# Dependencies first, so the layer is reused when only application code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Everything else, docs/ included - the corpus the chat is grounded in ships
# with the image rather than being fetched at runtime.
COPY . .

EXPOSE 8080

# Single process, matching what the deploy workflow's generated Dockerfile runs.
#
# Do not raise this to multiple workers without revisiting rate_limit.py: its
# counters are per-process, so N workers multiply the global ceiling by N and
# weaken the cost guard on the Gemini and email endpoints. The app is I/O bound,
# so one uvicorn process handles this workload's concurrency on its own.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]