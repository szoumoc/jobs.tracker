package jobs

import (
	"context"

	"job-tracker/backend/internal/models"
)

// JobRepository is the contract any database implementation must satisfy.
// To add a new database (e.g. PostgreSQL), create a new file that implements
// all methods in this interface and inject it in main.go.
type JobRepository interface {
	Create(ctx context.Context, job *models.Job) error
	GetByID(ctx context.Context, id string) (*models.Job, error)
	GetAll(ctx context.Context) ([]*models.Job, error)
	Update(ctx context.Context, job *models.Job) error
	Delete(ctx context.Context, id string) error
}
