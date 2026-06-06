FROM golang:1.20 AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o server ./cmd/server

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=builder /app/server .

CMD ["/app/server"]