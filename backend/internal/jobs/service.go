package jobs

import (
	"errors"
)

// Job represents a job entity in the application.
type Job struct {
	ID          string
	Title       string
	Description string
	Company     string
	Status      string
}

// JobService provides methods for job-related business logic.
type JobService struct {
	repo JobRepository
}

// NewJobService creates a new JobService.
func NewJobService(repo JobRepository) *JobService {
	return &JobService{repo: repo}
}

// CreateJob creates a new job.
func (s *JobService) CreateJob(job Job) (Job, error) {
	if job.Title == "" || job.Company == "" {
		return Job{}, errors.New("job title and company are required")
	}
	return s.repo.Create(job)
}

// GetJob retrieves a job by its ID.
func (s *JobService) GetJob(id string) (Job, error) {
	return s.repo.GetByID(id)
}

// UpdateJob updates an existing job.
func (s *JobService) UpdateJob(job Job) (Job, error) {
	if job.ID == "" {
		return Job{}, errors.New("job ID is required")
	}
	return s.repo.Update(job)
}

// DeleteJob deletes a job by its ID.
func (s *JobService) DeleteJob(id string) error {
	return s.repo.Delete(id)
}

// ListJobs retrieves all jobs.
func (s *JobService) ListJobs() ([]Job, error) {
	return s.repo.List()
}