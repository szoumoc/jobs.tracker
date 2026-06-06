package api

import (
	"encoding/json"
	"net/http"

	"job-tracker/backend/internal/jobs"
	"job-tracker/backend/internal/models"

	"github.com/gorilla/mux"
)

// Handler holds a reference to the service layer only.
// It knows nothing about the repository.
type Handler struct {
	svc *jobs.JobService
}

// NewHandler creates a new Handler with a JobService.
func NewHandler(svc *jobs.JobService) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers all HTTP routes.
func (h *Handler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/health", h.HealthHandler).Methods(http.MethodGet)
	r.HandleFunc("/api/jobs", h.GetJobs).Methods(http.MethodGet)
	r.HandleFunc("/api/jobs/{id}", h.GetJobByID).Methods(http.MethodGet)
	r.HandleFunc("/api/jobs", h.CreateJob).Methods(http.MethodPost)
	r.HandleFunc("/api/jobs/{id}", h.UpdateJob).Methods(http.MethodPut)
	r.HandleFunc("/api/jobs/{id}", h.DeleteJob).Methods(http.MethodDelete)
}

func (h *Handler) GetJobs(w http.ResponseWriter, r *http.Request) {
	jobList, err := h.svc.ListJobs(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list jobs"})
		return
	}
	if jobList == nil {
		jobList = []*models.Job{}
	}
	writeJSON(w, http.StatusOK, jobList)
}

func (h *Handler) GetJobByID(w http.ResponseWriter, r *http.Request) {
	// TODO: implement
}

func (h *Handler) CreateJob(w http.ResponseWriter, r *http.Request) {
	// TODO: implement
}

func (h *Handler) UpdateJob(w http.ResponseWriter, r *http.Request) {
	// TODO: implement
}

func (h *Handler) DeleteJob(w http.ResponseWriter, r *http.Request) {
	// TODO: implement
}

func (h *Handler) HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Server is Healthy"))
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
