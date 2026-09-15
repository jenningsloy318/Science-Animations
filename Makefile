.PHONY: dev stop reload

# 本地开发：前台运行 Caddy（Ctrl+C 停止）
dev:
	caddy run --config Caddyfile

# 后台运行
start:
	caddy start --config Caddyfile

# 重新加载配置（不中断连接）
reload:
	caddy reload --config Caddyfile

# 停止后台 Caddy
stop:
	caddy stop
