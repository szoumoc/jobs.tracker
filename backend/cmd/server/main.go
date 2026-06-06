package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"

	"job-tracker/backend/internal/api"
	"job-tracker/backend/internal/config"
	"job-tracker/backend/internal/jobs"
)

func main() {
	// Load config from .env / environment
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("failed to load config:", err)
	}

	// Atlas-recommended: use Stable API v1
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().
		ApplyURI(cfg.MongoURI).
		SetServerAPIOptions(serverAPI)

	// Connect to MongoDB Atlas
	client, err := mongo.Connect(opts)
	if err != nil {
		log.Fatal("failed to connect to MongoDB:", err)
	}
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Fatal(err)
		}
	}()

	// Ping to confirm connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		log.Fatal("MongoDB ping failed:", err)
	}
	log.Println("Connected to MongoDB Atlas!")

	// Layer 1: Repository — data access via MongoDB
	col := client.Database(cfg.MongoDBName).Collection("jobs")
	repo := jobs.NewMongoJobRepository(col)

	// Layer 2: Service — business logic
	svc := jobs.NewJobService(repo)

	// Layer 3: Handler — HTTP concerns only
	r := mux.NewRouter()
	h := api.NewHandler(svc)
	h.RegisterRoutes(r)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Starting server on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
