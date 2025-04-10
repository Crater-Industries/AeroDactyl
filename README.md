# Aerodactyl Dashboard

Aerodactyl is a user-friendly dashboard designed for seamless server management with Pterodactyl. It provides an easy way for users to create, manage, and monitor their game servers with a simple, clean interface.

## Features

- **Server Creation**: Easily create new game servers with customizable options.
- **User-Friendly Interface**: Simple and intuitive dashboard built with modern web technologies.
- **Pterodactyl Integration**: Full integration with Pterodactyl for backend server management.
- **Economy**: Features include server balance management, transfers, earning through tasks, Linkvertise integration, and a virtual store for in-dashboard purchases.

⚠️ **This dashboard is still in development and may not work as expected.**

# Install Guide

## 1. Configuring AeroDactyl

### Pterodactyl method (easiest)

Warning: You need Pterodactyl already set up on a domain for this method to work

<strong>1.1</strong> Upload the file above onto a Pterodactyl NodeJS server [Download the egg from Parkervcp's GitHub Repository](https://github.com/parkervcp/eggs/blob/master/generic/nodejs/egg-node-js-generic.json)

<strong>1.2</strong> Unarchive the file and set the server to use NodeJS 16

### Direct method

<strong>1.1</strong> Install Node.js 16 or newer, it's recommended to install it with nvm :

- `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash`
- reopen a new ssh session (e.g., restart putty)
- `nvm install 16`
- check the node version with `node -v` and switch between versions with `nvm use <version>`

<strong>1.2</strong> Download AeroDactyl files in /var/www/AeroDactyl :

- `git clone https://github.com/Crater-Industries/AeroDactyl.git /var/www/AeroDactyl`

<strong>1.3</strong> Installing required node modules (and build dependencies to avoid errors) :

- `apt-get update && apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev build-essential`
- `cd /var/www/AeroDactyl && npm i`

After configuring settings.json, to start the server, use `node app.js`</br>
To run in the background, use PM2 (see PM2 section)</br>

## 2. Setting up webserver

<strong>2.1</strong> Rename exemple_settings.json to settings.json and configure settings.json (specify panel domain/apikey and discord auth settings for it to work)

<strong>2.2</strong> Start the server (Ignore the 2 strange errors that might come up)

<strong>2.3</strong> Login to your DNS manager, point the domain you want your dashboard to be hosted on to your VPS IP address. (Example: dashboard.domain.com 192.168.0.1)

<strong>2.4</strong> Run `apt install nginx && apt install certbot` on the vps

<strong>2.5</strong> Run `ufw allow 80` and `ufw allow 443` on the vps

<strong>2.6</strong> Run `certbot certonly -d <Your AeroDactyl Domain>` then do 1 and put your email

<strong>2.7</strong> Run `nano /etc/nginx/sites-enabled/AeroDactyl.conf`

<strong>2.8</strong> Paste the configuration at the bottom of this and replace with the IP of the pterodactyl server including the port and with the domain you want your dashboard to be hosted on.

<strong>2.9</strong> Run `systemctl restart nginx` and try open your domain.

# Running in background and on startup
Installing [pm2](https://github.com/Unitech/pm2):
- Run `npm install pm2 -g` on the vps

Starting the Dashboard in Background:
- Change directory to your AeroDactyl folder Using `cd` command, Example: `cd /var/www/AeroDactyl` 
- To run AeroDactyl, use `pm2 start app.js --name "AeroDactyl"`
- To view logs, run `pm2 logs AeroDactyl`

Making the dashboard runs on startup:
- Make sure your dashboard is running in the background with the help of [pm2](https://github.com/Unitech/pm2)
- You can check if AeroDactyl is running in background with `pm2 list`
- Once you confirmed that AeroDactyl is running in background, you can create a startup script by running `pm2 startup` and `pm2 save`
- Note: Supported init systems are `systemd`, `upstart`, `launchd`, `rc.d`
- To stop your AeroDactyl from running in the background, use `pm2 unstartup`

To stop a currently running AeroDactyl instance, use `pm2 stop AeroDactyl`

# Credits
<strong>1.1</strong> All our work is made by the XaloraLabs Inc. Team. Thanks to everyone

# Nginx Proxy Config

```Nginx
server {
    listen 80;
    server_name <domain>;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <domain>;

    ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /afk/ws {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://localhost:<port>/afk/ws;
    }
    location / {
        proxy_pass http://localhost:<port>/;
        proxy_buffering off;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
