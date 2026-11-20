package main

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	dateLayout   = "2006-01-02"
	defaultLimit = 50
	maxLimit     = 200
	maxWeeks     = 106
	maxSearchLen = 100
)

type capacityParams struct {
	from, to time.Time
	limit    int
	offset   int
	search   string
	nameDesc bool
}

// parseCapacityParams snaps the requested range outwards to whole
// Monday-Sunday weeks.
func parseCapacityParams(q url.Values) (capacityParams, error) {
	from, err := time.Parse(dateLayout, q.Get("from"))
	if err != nil {
		return capacityParams{}, errors.New("from must be a date like 2026-01-05")
	}
	to, err := time.Parse(dateLayout, q.Get("to"))
	if err != nil {
		return capacityParams{}, errors.New("to must be a date like 2026-01-05")
	}
	if to.Before(from) {
		return capacityParams{}, errors.New("to must not be before from")
	}

	p := capacityParams{
		from:  weekStart(from),
		to:    weekStart(to).AddDate(0, 0, 6),
		limit: defaultLimit,
	}
	if weeks := len(p.weeks()); weeks > maxWeeks {
		return capacityParams{}, fmt.Errorf("range covers %d weeks, the maximum is %d", weeks, maxWeeks)
	}

	if v := q.Get("limit"); v != "" {
		if p.limit, err = strconv.Atoi(v); err != nil || p.limit < 1 || p.limit > maxLimit {
			return capacityParams{}, fmt.Errorf("limit must be between 1 and %d", maxLimit)
		}
	}
	if v := q.Get("offset"); v != "" {
		if p.offset, err = strconv.Atoi(v); err != nil || p.offset < 0 {
			return capacityParams{}, errors.New("offset must be 0 or more")
		}
	}

	p.search = strings.TrimSpace(q.Get("q"))
	if len(p.search) > maxSearchLen {
		return capacityParams{}, fmt.Errorf("q must be at most %d characters", maxSearchLen)
	}
	switch q.Get("sort") {
	case "", "name":
	case "-name":
		p.nameDesc = true
	default:
		return capacityParams{}, errors.New("sort must be name or -name")
	}
	return p, nil
}

func (p capacityParams) weeks() []time.Time {
	var weeks []time.Time
	for w := p.from; !w.After(p.to); w = w.AddDate(0, 0, 7) {
		weeks = append(weeks, w)
	}
	return weeks
}

func weekStart(t time.Time) time.Time {
	daysSinceMonday := (int(t.Weekday()) + 6) % 7
	return t.AddDate(0, 0, -daysSinceMonday)
}
