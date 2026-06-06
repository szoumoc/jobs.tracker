package jobs

import (
	"context"
	"errors"

	"job-tracker/backend/internal/models"
)

// JobService provides methods for job-related business logic.
type JobService struct {
	repo JobRepository
}

// NewJobService creates a new JobService.
func NewJobService(repo JobRepository) *JobService {
	return &JobService{repo: repo}
}

// CreateJob creates a new job.
func (s *JobService) CreateJob(ctx context.Context, job *models.Job) error {
	if job.Title == "" || job.Company == "" {
		return errors.New("job title and company are required")
	}
	return s.repo.Create(ctx, job)
}

// GetJob retrieves a job by its ID.
func (s *JobService) GetJob(ctx context.Context, id string) (*models.Job, error) {
	return s.repo.GetByID(ctx, id)
}

// UpdateJob updates an existing job.
func (s *JobService) UpdateJob(ctx context.Context, job *models.Job) error {
	if job.ID == "" {
		return errors.New("job ID is required")
	}
	return s.repo.Update(ctx, job)
}

// DeleteJob deletes a job by its ID.
func (s *JobService) DeleteJob(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// ListJobs retrieves all jobs.
func (s *JobService) ListJobs(ctx context.Context) ([]*models.Job, error) {
	return s.repo.GetAll(ctx)
}