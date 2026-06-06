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

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatal("failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(ctx)

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("MongoDB ping failed:", err)
	}
	log.Println("Connected to MongoDB")

	// Layer 1: Repository — data access via MongoDB
	col := client.Database(cfg.MongoDBName).Collection("jobs")
	repo := jobs.NewMongoJobRepository(col)

	// Layer 2: Service — business logic
	svc := jobs.NewJobService(repo)

	// Layer 3: Handler — HTTP concerns only
	r := mux.NewRouter()
	h := api.NewHandler(svc)
	h.RegisterRoutes(r)
	http.Handle("/", r)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Starting server on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}
