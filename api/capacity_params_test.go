package main

import (
	"net/url"
	"testing"
)

func TestParseCapacityParamsSnapsToWholeWeeks(t *testing.T) {
	tests := []struct {
		name, from, to   string
		wantFrom, wantTo string
		wantWeeks        int
	}{
		{"monday to friday", "2025-12-29", "2026-01-16", "2025-12-29", "2026-01-18", 3},
		{"thursday in a new year", "2026-01-01", "2026-01-01", "2025-12-29", "2026-01-04", 1},
		{"sunday ends its week", "2026-01-04", "2026-01-05", "2025-12-29", "2026-01-11", 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p, err := parseCapacityParams(url.Values{"from": {tt.from}, "to": {tt.to}})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := p.from.Format(dateLayout); got != tt.wantFrom {
				t.Errorf("from = %s, want %s", got, tt.wantFrom)
			}
			if got := p.to.Format(dateLayout); got != tt.wantTo {
				t.Errorf("to = %s, want %s", got, tt.wantTo)
			}
			if got := len(p.weeks()); got != tt.wantWeeks {
				t.Errorf("weeks = %d, want %d", got, tt.wantWeeks)
			}
		})
	}
}

func TestParseCapacityParamsRejectsBadInput(t *testing.T) {
	tests := map[string]url.Values{
		"missing dates":   {},
		"not a date":      {"from": {"yesterday"}, "to": {"2026-01-16"}},
		"to before from":  {"from": {"2026-01-16"}, "to": {"2025-12-29"}},
		"range too wide":  {"from": {"2020-01-01"}, "to": {"2026-01-01"}},
		"limit too big":   {"from": {"2026-01-05"}, "to": {"2026-01-09"}, "limit": {"100000"}},
		"negative offset": {"from": {"2026-01-05"}, "to": {"2026-01-09"}, "offset": {"-1"}},
		"unknown sort":    {"from": {"2026-01-05"}, "to": {"2026-01-09"}, "sort": {"hours"}},
	}
	for name, q := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := parseCapacityParams(q); err == nil {
				t.Error("expected an error, got none")
			}
		})
	}
}

func TestParseCapacityParamsSearchAndSort(t *testing.T) {
	p, err := parseCapacityParams(url.Values{
		"from": {"2026-01-05"}, "to": {"2026-01-09"}, "q": {"  ana "}, "sort": {"-name"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.search != "ana" {
		t.Errorf("search = %q, want %q", p.search, "ana")
	}
	if !p.nameDesc {
		t.Error("sort=-name should set nameDesc")
	}
}
