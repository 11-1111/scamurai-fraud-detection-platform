# syntax=docker/dockerfile:1
#
# Build context is apps/transactions-api.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore against the project file alone first, so the restore layer survives
# source edits.
COPY API3-BACKEND.csproj ./
RUN dotnet restore API3-BACKEND.csproj

COPY . .
RUN dotnet publish API3-BACKEND.csproj \
      --configuration Release \
      --no-restore \
      --output /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Kestrel listens on 8080 so the container can run unprivileged: binding 80
# would need capabilities this does not have.
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

# The .NET runtime images carry neither curl nor wget, so a container-level
# healthcheck has to bring its own client. Installed before the USER switch
# because apt needs root.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app .

# APP_UID is defined by the base image as a non-root account.
USER $APP_UID

EXPOSE 8080

# Swagger is only mapped in Development, so the check uses the search
# endpoint, which exists in every environment. The URL is quoted because an
# unquoted & would background the command. -f makes a 4xx or 5xx a failure,
# so a pass means the request genuinely succeeded -- which also exercises the
# database connection rather than only the listener.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["/bin/sh", "-c", "curl -fsS -o /dev/null 'http://127.0.0.1:8080/api/transactions/search?page=1&pageSize=1'"]

ENTRYPOINT ["dotnet", "API3-BACKEND.dll"]
