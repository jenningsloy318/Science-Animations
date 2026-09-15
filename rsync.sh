#!/bin/bash
rsync -av --chmod=D755,F644 --exclude=papers --exclude=.gitignore  --exclude=.worktree --exclude=caddy-storage --exclude=.pi --exclude=Caddyfile --exclude=Makefile --exclude=.git --exclude=rsync.sh ./ vps4:/var/www/html/
rsync -av --chmod=D755,F644 --exclude=papers --exclude=.gitignore  --exclude=.worktree --exclude=caddy-storage --exclude=.pi --exclude=Caddyfile --exclude=Makefile --exclude=.git --exclude=rsync.sh ./ vps5:/var/www/html/
