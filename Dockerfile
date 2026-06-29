FROM ghcr.io/astral-sh/uv:python3.13-trixie-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev
COPY . /app
RUN uv sync --locked --no-dev
RUN mkdir -p /data
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]