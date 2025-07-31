FROM python:3.13.1-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE $PORT

CMD python3 -m gunicorn wsgi:app --bind 0.0.0.0:$PORT 