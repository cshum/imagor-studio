package resolver

import (
	"encoding/json"
	"fmt"
)

// EditorState mirrors the TypeScript ImageEditorState interface.
// JSON tags use camelCase to match the frontend's serialised format.
type EditorState struct {
	// Base-image info (present when state was captured by markInitialState)
	ImagePath          *string     `json:"imagePath,omitempty"`
	OriginalDimensions *Dimensions `json:"originalDimensions,omitempty"`

	// Dimensions
	Width  *int `json:"width,omitempty"`
	Height *int `json:"height,omitempty"`

	// Fill-mode (f-token) dimensions — layer transforms only
	WidthFull        bool `json:"widthFull,omitempty"`
	WidthFullOffset  *int `json:"widthFullOffset,omitempty"`
	HeightFull       bool `json:"heightFull,omitempty"`
	HeightFullOffset *int `json:"heightFullOffset,omitempty"`

	// Fitting
	Stretch *bool   `json:"stretch,omitempty"`
	FitIn   *bool   `json:"fitIn,omitempty"`
	Smart   *bool   `json:"smart,omitempty"`
	HAlign  *string `json:"hAlign,omitempty"`
	VAlign  *string `json:"vAlign,omitempty"`

	// Filters
	Brightness *float64 `json:"brightness,omitempty"`
	Contrast   *float64 `json:"contrast,omitempty"`
	Saturation *float64 `json:"saturation,omitempty"`
	Hue        *float64 `json:"hue,omitempty"`
	Blur       *float64 `json:"blur,omitempty"`
	Sharpen    *float64 `json:"sharpen,omitempty"`
	Proportion *float64 `json:"proportion,omitempty"`
	Grayscale  *bool    `json:"grayscale,omitempty"`

	RoundCornerRadius *float64 `json:"roundCornerRadius,omitempty"`

	// Transform
	HFlip    *bool `json:"hFlip,omitempty"`
	VFlip    *bool `json:"vFlip,omitempty"`
	Rotation *int  `json:"rotation,omitempty"`

	// Output format / quality
	Format   *string `json:"format,omitempty"`
	Quality  *int    `json:"quality,omitempty"`
	MaxBytes *int    `json:"maxBytes,omitempty"`

	// Metadata stripping
	StripIcc  *bool `json:"stripIcc,omitempty"`
	StripExif *bool `json:"stripExif,omitempty"`

	// Crop (in original image coordinates)
	CropLeft   *float64 `json:"cropLeft,omitempty"`
	CropTop    *float64 `json:"cropTop,omitempty"`
	CropWidth  *float64 `json:"cropWidth,omitempty"`
	CropHeight *float64 `json:"cropHeight,omitempty"`

	// Visual-crop mode (UI state — skip most transforms when true)
	VisualCropEnabled *bool `json:"visualCropEnabled,omitempty"`

	// Fill colour for padding / transparent areas
	FillColor *string `json:"fillColor,omitempty"`

	// Padding (only effective when FillColor is defined)
	PaddingTop    *int `json:"paddingTop,omitempty"`
	PaddingRight  *int `json:"paddingRight,omitempty"`
	PaddingBottom *int `json:"paddingBottom,omitempty"`
	PaddingLeft   *int `json:"paddingLeft,omitempty"`

	// Layers (image and text overlays)
	Layers []*EditorLayer `json:"layers,omitempty"`
}

// hasCropParams returns true when all four crop fields are present.
func (s *EditorState) hasCropParams() bool {
	return s.CropLeft != nil && s.CropTop != nil && s.CropWidth != nil && s.CropHeight != nil
}

// isVisualCropEnabled is a nil-safe getter.
func (s *EditorState) isVisualCropEnabled() bool {
	return s.VisualCropEnabled != nil && *s.VisualCropEnabled
}

// Dimensions holds width and height as integers.
type Dimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// EditorLayer is a union of ImageLayer and TextLayer, discriminated by Type.
// All fields from both variants live in this single struct; callers use Type to decide
// which fields are meaningful.
type EditorLayer struct {
	// Discriminator — "image" or "text"
	Type string `json:"type"`

	// Common
	ID      string `json:"id"`
	Name    string `json:"name"`
	Visible bool   `json:"visible"`
	Locked  *bool  `json:"locked,omitempty"`

	// Position — JSON value can be a number or a string ("left", "center", "right-20", …)
	X json.RawMessage `json:"x"`
	Y json.RawMessage `json:"y"`

	// Compositing (shared)
	Alpha     int    `json:"alpha"`
	BlendMode string `json:"blendMode"`

	// ── ImageLayer fields ──────────────────────────────────────────────────
	ImagePath          *string      `json:"imagePath,omitempty"`
	OriginalDimensions *Dimensions  `json:"originalDimensions,omitempty"`
	Transforms         *EditorState `json:"transforms,omitempty"`

	// ── TextLayer fields ───────────────────────────────────────────────────
	Text      *string  `json:"text,omitempty"`
	Font      *string  `json:"font,omitempty"`
	FontStyle *string  `json:"fontStyle,omitempty"`
	FontSize  *float64 `json:"fontSize,omitempty"`
	Color     *string  `json:"color,omitempty"`

	// width / height in TextLayer are number | string ("80p", "f", "f-N", …)
	TextWidth  json.RawMessage `json:"width,omitempty"`
	TextHeight json.RawMessage `json:"height,omitempty"`

	Align   *string  `json:"align,omitempty"`
	Justify *bool    `json:"justify,omitempty"`
	Wrap    *string  `json:"wrap,omitempty"`
	Spacing *float64 `json:"spacing,omitempty"`
	DPI     *int     `json:"dpi,omitempty"`
}

// ─── helper functions ─────────────────────────────────────────────────────────

// parsePositionValue converts a position JSON value (number or string) to its string
// representation suitable for use in imagor filter args.
func parsePositionValue(raw json.RawMessage) string {
	if len(raw) == 0 {
		return "0"
	}
	// Try numeric first
	var n float64
	if err := json.Unmarshal(raw, &n); err == nil {
		if n == float64(int(n)) {
			return fmt.Sprintf("%d", int(n))
		}
		return fmt.Sprintf("%g", n)
	}
	// Try string
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return "0"
}

// intPtrVal safely dereferences an *int, returning 0 when nil.
func intPtrVal(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

// boolPtrVal safely dereferences a *bool, returning the default when nil.
func boolPtrVal(p *bool, def bool) bool {
	if p == nil {
		return def
	}
	return *p
}

// float64PtrVal safely dereferences a *float64, returning 0 when nil.
func float64PtrVal(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

// maxInt returns the larger of a and b.
func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
