#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun 未安装，请先安装 bun" >&2
  exit 1
fi

SERVE_PORT="${PORT:-4173}"

cleanup() {
  if [[ -n "${MACH_PID:-}" ]] && kill -0 "$MACH_PID" 2>/dev/null; then
    kill "$MACH_PID" 2>/dev/null || true
  fi
  if [[ -n "${SERVE_PID:-}" ]] && kill -0 "$SERVE_PID" 2>/dev/null; then
    kill "$SERVE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev] 启动状态机构建 (watch)..."
bun run dev:machines &
MACH_PID=$!

if command -v python3 >/dev/null 2>&1; then
  echo "[dev] 启动静态服务 (python3) -> http://localhost:${SERVE_PORT}/playground.html"
  python3 -m http.server "${SERVE_PORT}" --directory "$ROOT_DIR" >/dev/null 2>&1 &
  SERVE_PID=$!
elif command -v python >/dev/null 2>&1; then
  echo "[dev] 启动静态服务 (python) -> http://localhost:${SERVE_PORT}/playground.html"
  python -m http.server "${SERVE_PORT}" --directory "$ROOT_DIR" >/dev/null 2>&1 &
  SERVE_PID=$!
elif command -v bunx >/dev/null 2>&1; then
  echo "[dev] 启动静态服务 (bunx serve) -> http://localhost:${SERVE_PORT}/playground.html"
  bunx serve "$ROOT_DIR" --port "${SERVE_PORT}" >/dev/null 2>&1 &
  SERVE_PID=$!
else
  echo "[dev] 未找到 python 或 bunx，跳过静态服务，请手动启动。" >&2
fi

echo "[dev] 启动 Tailwind 构建 (watch)..."
bun dev
