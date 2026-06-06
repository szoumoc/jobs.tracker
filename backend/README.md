# Job Tracker Backend

This is the backend service for the Job Tracker application, written in Go. It provides REST API endpoints to manage job applications.

## Prerequisites

To run this project locally, you need to have:
* **Go**: Version `1.25` or higher installed. (Verify with `go version`).

## Project Structure

The project follows a standard Go project layout:

```text
backend/
├── cmd/
│   └── server/
│       └── main.go       # Entry point of the application
├── internal/
│   ├── api/
│   │   └── handlers.go   # HTTP handlers & route registration
│   ├── jobs/
│   │   ├── repository.go # Data repository (In-memory storage)
│   │   └── service.go    # Business logic layer
│   └── models/
│       └── job.go        # Shared domain models
├── Dockerfile            # Containerization instructions
├── go.mod                # Module definition & dependency manifest
└── go.sum                # Dependency verification checksums
```

## Getting Started

### 1. Download Dependencies

Run the following command to download and cache the required dependencies:
```bash
go mod tidy
```

### 2. Run the Server

Start the development server:
```bash
go run cmd/server/main.go
```
The server will start listening on port `:8080` by default.

### 3. Build the Binary

Compile the application into a single executable binary:
```bash
go build -o server cmd/server/main.go
```

## Architecture & Code Conventions

The codebase uses a clean, layered architecture:

1. **Routing / API Layer (`internal/api`)**:
   * Registers REST HTTP routes.
   * Parses requests, manages context, and handles HTTP responses.
2. **Service / Business Layer (`internal/jobs/service.go`)**:
   * Orchestrates the business logic rules (e.g., verifying mandatory fields).
   * Talks to the Repository layer.
3. **Repository / Data Layer (`internal/jobs/repository.go`)**:
   * Interacts with storage (currently implemented as an thread-safe in-memory map `InMemoryJobRepository`).

### Module Path Reminder

This project uses the Go module name **`job-tracker/backend`**.
Whenever you import local packages (e.g., inside `internal`), always prefix the import path with the module name:

```go
import (
    "job-tracker/backend/internal/models"
    "job-tracker/backend/internal/jobs"
)
```
Do **not** use relative imports (`../jobs`) or import them as just `"backend/internal/jobs"`.
