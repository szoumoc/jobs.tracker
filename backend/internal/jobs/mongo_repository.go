package jobs

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"job-tracker/backend/internal/models"
)

// MongoJobRepository is a MongoDB implementation of JobRepository.
type MongoJobRepository struct {
	col *mongo.Collection
}

// NewMongoJobRepository creates a MongoJobRepository connected to the given collection.
func NewMongoJobRepository(col *mongo.Collection) *MongoJobRepository {
	return &MongoJobRepository{col: col}
}

// execute is the internal helper that runs a Find query and decodes all results.
func (r *MongoJobRepository) execute(ctx context.Context, filter interface{}) ([]*models.Job, error) {
	cursor, err := r.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var jobs []*models.Job
	if err := cursor.All(ctx, &jobs); err != nil {
		return nil, err
	}
	if jobs == nil {
		jobs = []*models.Job{}
	}
	return jobs, nil
}

func (r *MongoJobRepository) Create(ctx context.Context, job *models.Job) error {
	job.ID = bson.NewObjectID()
	now := time.Now().UTC().Format(time.RFC3339)
	job.CreatedAt = now
	job.UpdatedAt = now

	_, err := r.col.InsertOne(ctx, job)
	return err
}

func (r *MongoJobRepository) GetByID(ctx context.Context, id string) (*models.Job, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, errors.New("invalid job ID")
	}

	var job models.Job
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&job)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("job not found")
		}
		return nil, err
	}
	return &job, nil
}

func (r *MongoJobRepository) GetAll(ctx context.Context) ([]*models.Job, error) {
	return r.execute(ctx, bson.D{})
}

func (r *MongoJobRepository) Update(ctx context.Context, job *models.Job) error {
	oid, err := bson.ObjectIDFromHex(job.ID.Hex())
	if err != nil {
		return errors.New("invalid job ID")
	}
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	result, err := r.col.ReplaceOne(ctx, bson.M{"_id": oid}, job)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}
	return nil
}

func (r *MongoJobRepository) Delete(ctx context.Context, id string) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid job ID")
	}

	result, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return errors.New("job not found")
	}
	return nil
}
