#!/bin/sh
echo "window.env = {
  REACT_APP_API_URL: \"${REACT_APP_API_URL}\"
};" > /app/build/env-config.js
serve -s build -l 3001
