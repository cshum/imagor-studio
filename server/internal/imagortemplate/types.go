package imagortemplate

import "encoding/json"

// Transformations mirrors the TypeScript ImageEditorState interface.
// JSON tags use camelCase to match the frontend serialised format.
type Transformations struct {
	ImagePath          *string     `json:"imagePath,omitempty"`
	OriginalDimensions *Dimensions `json:"originalDimensions,omitempty"`

	Width  *int `json:"width,omitempty"`
	Height *int `json:"height,omitempty"`

	WidthFull        bool `json:"widthFull,omitempty"`
	WidthFullOffset  *int `json:"widthFullOffset,omitempty"`
	HeightFull       bool `json:"heightFull,omitempty"`
	HeightFullOffset *int `json:"heightFullOffset,omitempty"`

	Stretch *bool   `json:"stretch,omitempty"`
	FitIn   *bool   `json:"fitIn,omitempty"`
	Smart   *bool   `json:"smart,omitempty"`
	HAlign  *string `json:"hAlign,omitempty"`
	VAlign  *string `json:"vAlign,omitempty"`

	Brightness *float64 `json:"brightness,omitempty"`
	Contrast   *float64 `json:"contrast,omitempty"`
	Saturation *float64 `json:"saturation,omitempty"`
	Hue        *float64 `json:"hue,omitempty"`
	Blur       *float64 `json:"blur,omitempty"`
	Sharpen    *float64 `json:"sharpen,omitempty"`
	Proportion *float64 `json:"proportion,omitempty"`
	Grayscale  *bool    `json:"grayscale,omitempty"`

	RoundCornerRadius *float64 `json:"roundCornerRadius,omitempty"`

	HFlip    *bool `json:"hFlip,omitempty"`
	VFlip    *bool `json:"vFlip,omitempty"`
	Rotation *int  `json:"rotation,omitempty"`

	Format   *string `json:"format,omitempty"`
	Quality  *int    `json:"quality,omitempty"`
	MaxBytes *int    `json:"maxBytes,omitempty"`

	StripIcc  *bool `json:"stripIcc,omitempty"`
	StripExif *bool `json:"stripExif,omitempty"`

	CropLeft   *float64 `json:"cropLeft,omitempty"`
	CropTop    *float64 `json:"cropTop,omitempty"`
	CropWidth  *float64 `json:"cropWidth,omitempty"`
	CropHeight *float64 `json:"cropHeight,omitempty"`

	VisualCropEnabled *bool `json:"visualCropEnabled,omitempty"`

	FillColor *string `json:"fillColor,omitempty"`

	PaddingTop    *int `json:"paddingTop,omitempty"`
	PaddingRight  *int `json:"paddingRight,omitempty"`
	PaddingBottom *int `json:"paddingBottom,omitempty"`
	PaddingLeft   *int `json:"paddingLeft,omitempty"`

	Layers []*Layer `json:"layers,omitempty"`
}

// HasCropParams returns true when all four crop fields are present.
func (t *Transformations) HasCropParams() bool {
	return t.CropLeft != nil && t.CropTop != nil && t.CropWidth != nil && t.CropHeight != nil
}

// IsVisualCropEnabled is a nil-safe getter.
func (t *Transformations) IsVisualCropEnabled() bool {
	return t.VisualCropEnabled != nil && *t.VisualCropEnabled
}

// Dimensions holds width and height in pixels.
type Dimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// Layer is a union of ImageLayer and TextLayer discriminated by Type.
type Layer struct {
	Type    string `json:"type"`
	ID      string `json:"id"`
	Name    string `json:"name"`
	Visible bool   `json:"visible"`
	Locked  *bool  `json:"locked,omitempty"`

	X json.RawMessage `json:"x"`
	Y json.RawMessage `json:"y"`

	Alpha     int    `json:"alpha"`
	BlendMode string `json:"blendMode"`

	// ImageLayer fields
	ImagePath          *string          `json:"imagePath,omitempty"`
	OriginalDimensions *Dimensions      `json:"originalDimensions,omitempty"`
	Transforms         *Transformations `json:"transforms,omitempty"`

	// TextLayer fields
	Text      *string  `json:"text,omitempty"`
	Font      *string  `json:"font,omitempty"`
	FontStyle *string  `json:"fontStyle,omitempty"`
	FontSize  *float64 `json:"fontSize,omitempty"`
	Color     *string  `json:"color,omitempty"`

	TextWidth  json.RawMessage `json:"width,omitempty"`
	TextHeight json.RawMessage `json:"height,omitempty"`

	Align   *string  `json:"align,omitempty"`
	Justify *bool    `json:"justify,omitempty"`
	Wrap    *string  `json:"wrap,omitempty"`
	Spacing *float64 `json:"spacing,omitempty"`
	DPI     *int     `json:"dpi,omitempty"`
}

// Resolution is the result of ResolveContext.
type Resolution struct {
	Transforms *Transformations
	ImagePath  string
	OrigDims   Dimensions
	ParentDims *Dimensions
}

func intPtrVal(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

func boolPtrVal(p *bool, def bool) bool {
	if p == nil {
		return def
	}
	return *p
}

func float64PtrVal(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
