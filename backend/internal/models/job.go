package models

type Job struct {
    ID          string `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description"`
    Company     string `json:"company"`
    Location    string `json:"location"`
    Status      string `json:"status"` // e.g., "applied", "interviewing", "offer", "rejected"
    CreatedAt   string `json:"created_at"`
    UpdatedAt   string `json:"updated_at"`
}