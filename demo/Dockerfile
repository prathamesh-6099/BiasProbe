FROM python:3.11-slim

RUN pip install fastapi uvicorn pydantic

WORKDIR /app
COPY biased_mock_api.py .

ENV PORT=8080
EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn biased_mock_api:app --host 0.0.0.0 --port ${PORT}"]
