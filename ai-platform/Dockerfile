# Stage 1: Build & Train
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate training data and train models at build time
RUN python src/data/generate_data.py && \
    python src/training/train.py

# Stage 2: Serve
FROM python:3.11-slim AS production
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (includes trained models at src/models/ and data at src/data/)
COPY --from=builder /app/src ./src

EXPOSE 8080

CMD ["uvicorn", "src.serving.api:app", "--host", "0.0.0.0", "--port", "8080"]
