package jobs

import (
	"context"
	"errors"

	"job-tracker/backend/internal/models"
)

// JobService sits between the handler and the repository.
// It is the only layer that contains business logic.
type JobService struct {
	repo JobRepository
}

// NewJobService creates a new JobService.
func NewJobService(repo JobRepository) *JobService {
	return &JobService{repo: repo}
}

// ListJobs retrieves all jobs via the repository.
func (s *JobService) ListJobs(ctx context.Context) ([]*models.Job, error) {
	return s.repo.GetAll(ctx)
}

// GetJob retrieves a single job by ID.
func (s *JobService) GetJob(ctx context.Context, id string) (*models.Job, error) {
	return s.repo.GetByID(ctx, id)
}

// CreateJob validates and persists a new job.
func (s *JobService) CreateJob(ctx context.Context, job *models.Job) error {
	if job.Title == "" || job.Company == "" {
		return errors.New("job title and company are required")
	}
	return s.repo.Create(ctx, job)
}

// UpdateJob validates and updates an existing job.
func (s *JobService) UpdateJob(ctx context.Context, job *models.Job) error {
	if job.ID.IsZero() {
		return errors.New("job ID is required")
	}
	return s.repo.Update(ctx, job)
}

// DeleteJob removes a job by ID.
func (s *JobService) DeleteJob(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
