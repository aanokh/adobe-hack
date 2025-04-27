sudo .venv/bin/uvicorn app:app --host 0.0.0.0 --port 443 \
  --ssl-certfile=/etc/letsencrypt/live/wufhalwuhlwauhflu.online/fullchain.pem \
  --ssl-keyfile=/etc/letsencrypt/live/wufhalwuhlwauhflu.online/privkey.pem
