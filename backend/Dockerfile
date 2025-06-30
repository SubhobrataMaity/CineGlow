# Use official Python image
FROM python:3.11.3-slim-bullseye

# Set work directory
WORKDIR /app

# Security update
RUN apt-get update && apt-get upgrade -y && apt-get clean

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and model files
COPY . .

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 