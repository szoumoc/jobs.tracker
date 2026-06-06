package jobs

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/v2/bson"
	"job-tracker/backend/internal/models"
)

// JobRepository defines the data access contract.
type JobRepository interface {
	Create(ctx context.Context, job *models.Job) error
	GetByID(ctx context.Context, id string) (*models.Job, error)
	GetAll(ctx context.Context) ([]*models.Job, error)
	Update(ctx context.Context, job *models.Job) error
	Delete(ctx context.Context, id string) error
}

// InMemoryJobRepository is an in-memory implementation of JobRepository.
type InMemoryJobRepository struct {
	jobs map[string]*models.Job
}

// NewInMemoryJobRepository creates a new InMemoryJobRepository.
func NewInMemoryJobRepository() *InMemoryJobRepository {
	return &InMemoryJobRepository{
		jobs: make(map[string]*models.Job),
	}
}

// execute is an internal helper that converts the jobs map into a slice.
func (r *InMemoryJobRepository) execute() ([]*models.Job, error) {
	jobList := make([]*models.Job, 0, len(r.jobs))
	for _, job := range r.jobs {
		jobList = append(jobList, job)
	}
	return jobList, nil
}

func (r *InMemoryJobRepository) Create(ctx context.Context, job *models.Job) error {
	job.ID = bson.NewObjectID()
	key := job.ID.Hex()
	if _, exists := r.jobs[key]; exists {
		return errors.New("job already exists")
	}
	r.jobs[key] = job
	return nil
}

func (r *InMemoryJobRepository) GetByID(ctx context.Context, id string) (*models.Job, error) {
	job, exists := r.jobs[id]
	if !exists {
		return nil, errors.New("job not found")
	}
	return job, nil
}

func (r *InMemoryJobRepository) GetAll(ctx context.Context) ([]*models.Job, error) {
	return r.execute()
}

func (r *InMemoryJobRepository) Update(ctx context.Context, job *models.Job) error {
	key := job.ID.Hex()
	if _, exists := r.jobs[key]; !exists {
		return errors.New("job not found")
	}
	r.jobs[key] = job
	return nil
}

func (r *InMemoryJobRepository) Delete(ctx context.Context, id string) error {
	if _, exists := r.jobs[id]; !exists {
		return errors.New("job not found")
	}
	delete(r.jobs, id)
	return nil
}
