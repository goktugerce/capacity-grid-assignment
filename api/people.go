package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
)

const maxWeeklyHours = 168

type person struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	WeeklyHours float64 `json:"weeklyHours"`
}

// updatePersonRequest uses a pointer so a missing field is not read as 0,
// which is a valid capacity.
type updatePersonRequest struct {
	WeeklyHours *float64 `json:"weeklyHours"`
}

func (s *server) handleUpdatePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}

	var req updatePersonRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, `body must be JSON like {"weeklyHours": 32}`)
		return
	}
	if err := validateWeeklyHours(req.WeeklyHours); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	p, err := s.updateWeeklyHours(r.Context(), id, *req.WeeklyHours)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save weekly hours")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func validateWeeklyHours(hours *float64) error {
	if hours == nil {
		return errors.New("weeklyHours is required")
	}
	if *hours < 0 || *hours > maxWeeklyHours {
		return errors.New("weeklyHours must be between 0 and 168")
	}
	return nil
}

func (s *server) updateWeeklyHours(ctx context.Context, id int, hours float64) (person, error) {
	var p person
	err := s.db.QueryRow(ctx,
		`UPDATE people SET weekly_hours = $1 WHERE id = $2
		 RETURNING id, name, weekly_hours::float8`,
		hours, id,
	).Scan(&p.ID, &p.Name, &p.WeeklyHours)
	return p, err
}
