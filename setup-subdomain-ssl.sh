#!/bin/bash
# Run this after adding DNS A records for api and dashboard pointing to 74.48.140.135

set -e
echo 'Expanding certificate to include subdomains...'
certbot certonly --webroot -w /var/www/certbot   -d hackathon.khtain.com   -d api.hackathon.khtain.com   -d dashboard.hackathon.khtain.com   --expand --non-interactive --agree-tos --email test1@siliconflow.ca

echo 'Updating nginx configs...'

# API HTTPS
cat > /www/server/panel/vhost/nginx/api.hackathon.khtain.com.conf << 'APIEOF'
server {
    listen 80;
    server_name api.hackathon.khtain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.hackathon.khtain.com;

    ssl_certificate /etc/letsencrypt/live/hackathon.khtain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hackathon.khtain.com/privkey.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:4510;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    access_log /www/wwwlogs/api.hackathon.khtain.com.log;
    error_log /www/wwwlogs/api.hackathon.khtain.com.error.log;
}
APIEOF

# Dashboard HTTPS
cat > /www/server/panel/vhost/nginx/dashboard.hackathon.khtain.com.conf << 'DASHEOF'
server {
    listen 80;
    server_name dashboard.hackathon.khtain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dashboard.hackathon.khtain.com;

    ssl_certificate /etc/letsencrypt/live/hackathon.khtain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hackathon.khtain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4512;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    access_log /www/wwwlogs/dashboard.hackathon.khtain.com.log;
    error_log /www/wwwlogs/dashboard.hackathon.khtain.com.error.log;
}
DASHEOF

nginx -t && nginx -s reload
echo 'Done! Subdomains now have HTTPS.'
