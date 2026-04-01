# Build stage
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server/main.go

# Download migrate binary
RUN wget -qO /tmp/migrate.tar.gz https://github.com/golang-migrate/migrate/releases/download/v4.17.1/migrate.linux-amd64.tar.gz \
    && tar -xf /tmp/migrate.tar.gz -C /build migrate

# Production stage
FROM alpine:3.19 AS production

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /build/server .
COPY --from=builder /build/migrate .
COPY migrations/ ./migrations/

EXPOSE 8000

CMD ["./server"]

# Development stage (default)
FROM golang:1.24-alpine AS development

RUN apk add --no-cache git curl
RUN go install github.com/cosmtrek/air@v1.52.1
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

EXPOSE 8000

CMD ["air", "-c", ".air.toml"]
