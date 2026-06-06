package jobs

import (
	"context"
	"errors"
	"sync"

	"job-tracker/backend/internal/models"
)

type JobRepository interface {
	Create(ctx context.Context, job *models.Job) error
	GetByID(ctx context.Context, id string) (*models.Job, error)
	GetAll(ctx context.Context) ([]*models.Job, error)
	Update(ctx context.Context, job *models.Job) error
	Delete(ctx context.Context, id string) error
}

type InMemoryJobRepository struct {
	mu   sync.RWMutex
	jobs map[string]*models.Job
}

func NewInMemoryJobRepository() *InMemoryJobRepository {
	return &InMemoryJobRepository{
		jobs: make(map[string]*models.Job),
	}
}

func (r *InMemoryJobRepository) Create(ctx context.Context, job *models.Job) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.jobs[job.ID]; exists {
		return errors.New("job already exists")
	}
	r.jobs[job.ID] = job
	return nil
}

func (r *InMemoryJobRepository) GetByID(ctx context.Context, id string) (*models.Job, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	job, exists := r.jobs[id]
	if !exists {
		return nil, errors.New("job not found")
	}
	return job, nil
}

func (r *InMemoryJobRepository) GetAll(ctx context.Context) ([]*models.Job, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var jobList []*models.Job
	for _, job := range r.jobs {
		jobList = append(jobList, job)
	}
	return jobList, nil
}

func (r *InMemoryJobRepository) Update(ctx context.Context, job *models.Job) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.jobs[job.ID]; !exists {
		return errors.New("job not found")
	}
	r.jobs[job.ID] = job
	return nil
}

func (r *InMemoryJobRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.jobs[id]; !exists {
		return errors.New("job not found")
	}
	delete(r.jobs, id)
	return nil
}