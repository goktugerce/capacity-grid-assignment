package main

import "net/http"

type personCapacity struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	WeeklyHours float64   `json:"weeklyHours"`
	Allocated   []float64 `json:"allocated"`
}

// capacityResponse lists weeks by their Monday. Each person's Allocated is
// index-aligned with Weeks.
type capacityResponse struct {
	Weeks      []string         `json:"weeks"`
	People     []personCapacity `json:"people"`
	Total      int              `json:"total"`
	NextOffset *int             `json:"nextOffset"`
}

func (s *server) handleCapacity(w http.ResponseWriter, r *http.Request) {
	params, err := parseCapacityParams(r.URL.Query())
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	resp, err := s.queryCapacity(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load capacity")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
