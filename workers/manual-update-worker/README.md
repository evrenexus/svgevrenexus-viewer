# Evren Nexus Manual Update Worker

این Worker رمز را سمت سرور بررسی می‌کند و در صورت درست بودن، workflow
refresh-all.yml را با GitHub API اجرا می‌کند.

## Secrets

در Cloudflare Worker دو Secret بسازید:

- UPDATE_PASSWORD — رمز دلخواه جدید
- GITHUB_TOKEN — Fine-grained GitHub token با دسترسی Actions: Read and write روی repository evrenexus/svgevrenexus-viewer

رمز و توکن نباید داخل این repository قرار بگیرند.

## Deploy

این فایل را به عنوان Worker deploy کنید و URL آن را در manual-update.html قرار دهید.

Cloudflare Workers Secrets:
https://developers.cloudflare.com/workers/configuration/secrets/
