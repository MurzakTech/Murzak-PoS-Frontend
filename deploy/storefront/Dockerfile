# The online storefront of ONE shop, as a small container.
#
# Build (from the repository root):  docker build -f deploy/storefront/Dockerfile -t murzak-storefront .
# Run:  docker run -e SHOP_SLUG=mamanjeri -e ERP_HOST=mamanjeri.erp.murzaktech.tech -p 8080:8080 murzak-storefront
#
# One image serves every shop. The shop is chosen when the container starts (SHOP_SLUG, ERP_HOST), so a new shop is
# a new container, never a new build. The image contains only the storefront pages: no till, no staff screens, no sign-in.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# No API address is baked in: the shop's own nginx passes /api to that shop's ERP site (same origin, no CORS).
ENV REACT_APP_STOREFRONT_ONLY=true \
    REACT_APP_API_URL=/api/method \
    GENERATE_SOURCEMAP=false \
    INLINE_RUNTIME_CHUNK=false \
    CI=false
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
# Rendered with SHOP_SLUG / ERP_HOST by the nginx image's own start-up step
COPY deploy/storefront/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 deploy/storefront/40-shop-config.sh /docker-entrypoint.d/40-shop-config.sh
USER root
RUN touch /usr/share/nginx/html/shop-config.json && chown 101:101 /usr/share/nginx/html/shop-config.json
USER 101
ENV NGINX_ENVSUBST_FILTER="^(SHOP_SLUG|ERP_HOST)$"
