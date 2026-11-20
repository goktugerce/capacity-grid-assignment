package main

import "testing"

func TestValidateWeeklyHours(t *testing.T) {
	for _, h := range []float64{0, 37.5, 40, 168} {
		if err := validateWeeklyHours(&h); err != nil {
			t.Errorf("%v should be valid: %v", h, err)
		}
	}
	for _, h := range []float64{-1, 168.5, 1000} {
		if err := validateWeeklyHours(&h); err == nil {
			t.Errorf("%v should be rejected", h)
		}
	}
	if err := validateWeeklyHours(nil); err == nil {
		t.Error("a missing value should be rejected")
	}
}
