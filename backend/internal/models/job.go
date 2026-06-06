package models

import "go.mongodb.org/mongo-driver/v2/bson"

type Job struct {
	ID          bson.ObjectID `bson:"_id,omitempty"  json:"id"`
	Title       string        `bson:"title"          json:"title"`
	Description string        `bson:"description"    json:"description"`
	Company     string        `bson:"company"        json:"company"`
	Location    string        `bson:"location"       json:"location"`
	Status      string        `bson:"status"         json:"status"` // "applied", "interviewing", "offer", "rejected"
	CreatedAt   string        `bson:"created_at"     json:"created_at"`
	UpdatedAt   string        `bson:"updated_at"     json:"updated_at"`
}
