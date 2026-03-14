package imagortemplate

import (
	"encoding/json"
	"testing"
)

func intPtr(v int) *int             { return &v }
func boolPtr(v bool) *bool          { return &v }
func float64Ptr(v float64) *float64 { return &v }
func strPtr(v string) *string       { return &v }

func rawJSON(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

func TestScalePositionValue(t *testing.T) {
	tests := []struct {
		name        string
		raw         json.RawMessage
		scaleFactor float64
		want        string
	}{
		{"nil", nil, 1.0, "0"},
		{"zero number", rawJSON(0), 1.0, "0"},
		{"numeric scale 1", rawJSON(100), 1.0, "100"},
		{"numeric scale 0.5", rawJSON(100), 0.5, "50"},
		{"numeric scale 2", rawJSON(50), 2.0, "100"},
		{"string center passthrough", rawJSON("center"), 1.0, "center"},
		{"string center scaled", rawJSON("center"), 0.5, "center"},
		{"string left-20 passthrough", rawJSON("left-20"), 1.0, "left-20"},
		{"string left-20 scaled 0.5", rawJSON("left-20"), 0.5, "left-10"},
		{"string right-5 scaled 2", rawJSON("right-5"), 2.0, "right-10"},
		{"string top-100 scaled 0.5", rawJSON("top-100"), 0.5, "top-50"},
		{"empty string", rawJSON(""), 1.0, "0"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := scalePositionValue(tt.raw, tt.scaleFactor)
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestScaleTextWidth(t *testing.T) {
	tests := []struct {
		name        string
		raw         json.RawMessage
		scaleFactor float64
		want        string
	}{
		{"nil", nil, 1.0, "0"},
		{"zero", rawJSON(0), 1.0, "0"},
		{"negative", rawJSON(-5), 1.0, "0"},
		{"numeric scale 0.5", rawJSON(200), 0.5, "100"},
		{"string f passthrough", rawJSON("f"), 1.0, "f"},
		{"string f scaled", rawJSON("f"), 0.5, "f"},
		{"string f-20 scaled 0.5", rawJSON("f-20"), 0.5, "f-10"},
		{"string f-20 scaled 2", rawJSON("f-20"), 2.0, "f-40"},
		{"string f-10 near zero", rawJSON("f-10"), 0.01, "f"},
		{"full-20 alias", rawJSON("full-20"), 0.5, "f-10"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := scaleTextWidth(tt.raw, tt.scaleFactor)
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestEncodeTextToBase64url(t *testing.T) {
	tests := []struct {
		text string
		want string
	}{
		{"hello", "hello"},
		{"hello-world_123", "hello-world_123"},
		{"hello world", "b64:aGVsbG8gd29ybGQ"},
		{"Hello!", "b64:SGVsbG8h"},
		{"a b", "b64:YSBi"},
	}
	for _, tt := range tests {
		t.Run(tt.text, func(t *testing.T) {
			got := encodeTextToBase64url(tt.text)
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestNeedsBase64Encoding(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"bucket/image.jpg", false},
		{"bucket/my image.jpg", true},
		{"bucket/image?size=100", true},
		{"bucket/image#anchor", true},
		{"bucket/image&query", true},
		{"bucket/image()", true},
		{"bucket/image,other", true},
		{"trim/image.jpg", true},
		{"meta/image.jpg", true},
		{"fit-in/image.jpg", true},
		{"stretch/image.jpg", true},
		{"smart/image.jpg", true},
		{"images/trim-photo.jpg", false},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := needsBase64Encoding(tt.path)
			if got != tt.want {
				t.Errorf("needsBase64Encoding(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}

func TestComputeOutputDims(t *testing.T) {
	tests := []struct {
		name       string
		state      Transformations
		origDims   Dimensions
		parentDims *Dimensions
		want       Dimensions
	}{
		{
			name:     "identity",
			state:    Transformations{},
			origDims: Dimensions{800, 600},
			want:     Dimensions{800, 600},
		},
		{
			name:     "explicit dims",
			state:    Transformations{Width: intPtr(400), Height: intPtr(300)},
			origDims: Dimensions{800, 600},
			want:     Dimensions{400, 300},
		},
		{
			name: "crop changes source",
			state: Transformations{
				CropLeft: float64Ptr(10), CropTop: float64Ptr(10),
				CropWidth: float64Ptr(200), CropHeight: float64Ptr(150),
			},
			origDims: Dimensions{800, 600},
			want:     Dimensions{200, 150},
		},
		{
			name: "fit-in",
			state: Transformations{
				Width: intPtr(800), Height: intPtr(600), FitIn: boolPtr(true),
			},
			origDims: Dimensions{1600, 800},
			want:     Dimensions{800, 400},
		},
		{
			name: "padding with fill",
			state: Transformations{
				Width: intPtr(200), Height: intPtr(100),
				FillColor: strPtr("white"), PaddingTop: intPtr(10), PaddingRight: intPtr(5),
			},
			origDims: Dimensions{200, 100},
			want:     Dimensions{205, 110},
		},
		{
			name: "rotation 90 swaps axes",
			state: Transformations{
				Width: intPtr(400), Height: intPtr(300), Rotation: intPtr(90),
			},
			origDims: Dimensions{400, 300},
			want:     Dimensions{300, 400},
		},
		{
			name: "rotation 180 no swap",
			state: Transformations{
				Width: intPtr(400), Height: intPtr(300), Rotation: intPtr(180),
			},
			origDims: Dimensions{400, 300},
			want:     Dimensions{400, 300},
		},
		{
			name: "widthFull with parent",
			state: Transformations{
				WidthFull: true, Height: intPtr(100),
			},
			origDims:   Dimensions{200, 100},
			parentDims: &Dimensions{Width: 500, Height: 400},
			want:       Dimensions{500, 100},
		},
		{
			name: "widthFull with offset",
			state: Transformations{
				WidthFull: true, WidthFullOffset: intPtr(20), Height: intPtr(100),
			},
			origDims:   Dimensions{200, 100},
			parentDims: &Dimensions{Width: 500, Height: 400},
			want:       Dimensions{480, 100},
		},
		{
			name: "widthFull without parent falls back",
			state: Transformations{
				WidthFull: true, Height: intPtr(100),
			},
			origDims: Dimensions{200, 100},
			want:     Dimensions{200, 100},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ComputeOutputDims(tt.state, tt.origDims, tt.parentDims)
			if got != tt.want {
				t.Errorf("got %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestResolveContext_Root(t *testing.T) {
	imgPath := "bucket/photo.jpg"
	origDims := Dimensions{800, 600}
	base := Transformations{Width: intPtr(800), Height: intPtr(600)}

	res := ResolveContext(base, origDims, imgPath, nil)

	if res.ImagePath != imgPath {
		t.Errorf("ImagePath = %q, want %q", res.ImagePath, imgPath)
	}
	if res.OrigDims != origDims {
		t.Errorf("OrigDims = %+v, want %+v", res.OrigDims, origDims)
	}
	if res.ParentDims != nil {
		t.Error("ParentDims should be nil for root context")
	}
}

func TestResolveContext_Layer(t *testing.T) {
	imgPath := "bucket/photo.jpg"
	origDims := Dimensions{800, 600}
	layer1 := &Layer{
		ID: "layer-1", Type: "image", Visible: true,
		ImagePath:          strPtr("bucket/layer1.jpg"),
		OriginalDimensions: &Dimensions{400, 300},
		Transforms:         &Transformations{Width: intPtr(400), Height: intPtr(300)},
	}
	base := Transformations{Width: intPtr(800), Height: intPtr(600), Layers: []*Layer{layer1}}

	res := ResolveContext(base, origDims, imgPath, []string{"layer-1"})

	if res.ImagePath != "bucket/layer1.jpg" {
		t.Errorf("ImagePath = %q, want bucket/layer1.jpg", res.ImagePath)
	}
	if res.OrigDims != (Dimensions{400, 300}) {
		t.Errorf("OrigDims = %+v, want {400 300}", res.OrigDims)
	}
	if res.ParentDims == nil {
		t.Fatal("ParentDims should not be nil for layer context")
	}
	want := ComputeOutputDims(base, origDims, nil)
	if *res.ParentDims != want {
		t.Errorf("ParentDims = %+v, want %+v", *res.ParentDims, want)
	}
}

func TestResolveContext_UnknownLayer(t *testing.T) {
	imgPath := "bucket/photo.jpg"
	origDims := Dimensions{800, 600}
	base := Transformations{Width: intPtr(800), Height: intPtr(600)}

	res := ResolveContext(base, origDims, imgPath, []string{"nonexistent"})

	if res.ImagePath != imgPath {
		t.Errorf("should fall back to root, ImagePath = %q", res.ImagePath)
	}
}

func TestConvertToImagorParams_Dimensions(t *testing.T) {
	state := Transformations{Width: intPtr(300), Height: intPtr(200)}
	params := ConvertToImagorParams(state, Dimensions{600, 400}, nil, false, nil, "", false)
	if params.Width != 300 || params.Height != 200 {
		t.Errorf("dims = %dx%d, want 300x200", params.Width, params.Height)
	}
}

func TestConvertToImagorParams_Crop(t *testing.T) {
	state := Transformations{
		CropLeft: float64Ptr(10), CropTop: float64Ptr(20),
		CropWidth: float64Ptr(300), CropHeight: float64Ptr(200),
	}
	params := ConvertToImagorParams(state, Dimensions{600, 400}, nil, false, nil, "", false)
	if params.CropLeft != 10 || params.CropTop != 20 || params.CropRight != 310 || params.CropBottom != 220 {
		t.Errorf("crop = (%g,%g,%g,%g), want (10,20,310,220)",
			params.CropLeft, params.CropTop, params.CropRight, params.CropBottom)
	}
}

func TestConvertToImagorParams_Filters(t *testing.T) {
	state := Transformations{
		Brightness: float64Ptr(20),
		Contrast:   float64Ptr(-10),
		Grayscale:  boolPtr(true),
		Rotation:   intPtr(90),
		FillColor:  strPtr("white"),
	}
	params := ConvertToImagorParams(state, Dimensions{400, 300}, nil, false, nil, "", false)
	fm := make(map[string]string)
	for _, f := range params.Filters {
		fm[f.Name] = f.Args
	}
	if fm["brightness"] != "20" {
		t.Errorf("brightness = %q", fm["brightness"])
	}
	if fm["contrast"] != "-10" {
		t.Errorf("contrast = %q", fm["contrast"])
	}
	if _, ok := fm["grayscale"]; !ok {
		t.Error("missing grayscale filter")
	}
	if fm["rotate"] != "90" {
		t.Errorf("rotate = %q", fm["rotate"])
	}
	if fm["fill"] != "white" {
		t.Errorf("fill = %q", fm["fill"])
	}
}

func TestConvertToImagorParams_PreviewAddsWebp(t *testing.T) {
	state := Transformations{Width: intPtr(800), Height: intPtr(600)}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, true, nil, "", false)
	fm := make(map[string]string)
	for _, f := range params.Filters {
		fm[f.Name] = f.Args
	}
	if fm["format"] != "webp" {
		t.Errorf("format = %q, want webp", fm["format"])
	}
	if _, ok := fm["preview"]; !ok {
		t.Error("missing preview filter")
	}
}

func TestConvertToImagorParams_PreviewMaxScales(t *testing.T) {
	state := Transformations{Width: intPtr(800), Height: intPtr(600)}
	previewMax := &Dimensions{Width: 400, Height: 400}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, true, previewMax, "", false)
	if params.Width != 400 || params.Height != 300 {
		t.Errorf("dims = %dx%d, want 400x300", params.Width, params.Height)
	}
}

func TestConvertToImagorParams_NonPreviewFormat(t *testing.T) {
	state := Transformations{Width: intPtr(800), Height: intPtr(600), Format: strPtr("jpeg")}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, false, nil, "", false)
	fm := make(map[string]string)
	for _, f := range params.Filters {
		fm[f.Name] = f.Args
	}
	if fm["format"] != "jpeg" {
		t.Errorf("format = %q, want jpeg", fm["format"])
	}
	if _, ok := fm["preview"]; ok {
		t.Error("unexpected preview filter in non-preview mode")
	}
}

func TestConvertToImagorParams_VisualCropPreview(t *testing.T) {
	state := Transformations{
		Width: intPtr(800), Height: intPtr(600),
		VisualCropEnabled: boolPtr(true),
		CropLeft:          float64Ptr(0), CropTop: float64Ptr(0),
		CropWidth: float64Ptr(400), CropHeight: float64Ptr(300),
	}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, true, nil, "", state.IsVisualCropEnabled())
	if params.CropRight != 0 {
		t.Error("crop should be suppressed in visual-crop preview mode")
	}
	if params.Width != 800 || params.Height != 600 {
		t.Errorf("dims = %dx%d, want 800x600", params.Width, params.Height)
	}
}

func TestConvertToImagorParams_VisualCropPreview_SuppressFitInSmartFill(t *testing.T) {
	fillColor := "ffffff"
	hAlign := "left"
	vAlign := "top"
	state := Transformations{
		Width: intPtr(800), Height: intPtr(600),
		FitIn:             boolPtr(true),
		Smart:             boolPtr(true),
		HFlip:             boolPtr(true),
		VFlip:             boolPtr(true),
		HAlign:            &hAlign,
		VAlign:            &vAlign,
		FillColor:         &fillColor,
		VisualCropEnabled: boolPtr(true),
	}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, true, nil, "", state.IsVisualCropEnabled())

	if params.FitIn {
		t.Error("FitIn should be suppressed in visual-crop preview mode")
	}
	if params.Smart {
		t.Error("Smart should be suppressed in visual-crop preview mode")
	}
	if params.HFlip {
		t.Error("HFlip should be suppressed in visual-crop preview mode")
	}
	if params.VFlip {
		t.Error("VFlip should be suppressed in visual-crop preview mode")
	}
	if params.HAlign != "" {
		t.Errorf("HAlign = %q, want empty in visual-crop preview mode", params.HAlign)
	}
	if params.VAlign != "" {
		t.Errorf("VAlign = %q, want empty in visual-crop preview mode", params.VAlign)
	}
	for _, f := range params.Filters {
		if f.Name == "fill" {
			t.Error("fill filter should be suppressed in visual-crop preview mode")
		}
	}
}

func TestConvertToImagorParams_VisualCropPreview_NonPreviewAppliesAll(t *testing.T) {
	// When forPreview=false, all params must be applied even with visualCropEnabled.
	fillColor := "ffffff"
	hAlign := "left"
	vAlign := "top"
	state := Transformations{
		Width: intPtr(800), Height: intPtr(600),
		FitIn:             boolPtr(true),
		Smart:             boolPtr(true),
		HFlip:             boolPtr(true),
		VFlip:             boolPtr(true),
		HAlign:            &hAlign,
		VAlign:            &vAlign,
		FillColor:         &fillColor,
		VisualCropEnabled: boolPtr(true),
	}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, false, nil, "", false)

	if !params.FitIn {
		t.Error("FitIn should be applied in non-preview mode")
	}
	if !params.Smart {
		t.Error("Smart should be applied in non-preview mode")
	}
	if !params.HFlip {
		t.Error("HFlip should be applied in non-preview mode")
	}
	if !params.VFlip {
		t.Error("VFlip should be applied in non-preview mode")
	}
	hasFill := false
	for _, f := range params.Filters {
		if f.Name == "fill" {
			hasFill = true
		}
	}
	if !hasFill {
		t.Error("fill filter should be applied in non-preview mode")
	}
}

func TestConvertToImagorParams_SkipLayerID(t *testing.T) {
	ip := "img.jpg"
	state := Transformations{
		Width: intPtr(800), Height: intPtr(600),
		Layers: []*Layer{
			{ID: "skip", Type: "image", Visible: true, ImagePath: &ip},
			{ID: "keep", Type: "image", Visible: true, ImagePath: &ip},
		},
	}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, false, nil, "skip", false)
	count := 0
	for _, f := range params.Filters {
		if f.Name == "image" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("expected 1 image filter, got %d", count)
	}
}

func TestConvertToImagorParams_ProportionFilter(t *testing.T) {
	state := Transformations{Width: intPtr(800), Height: intPtr(600), Proportion: float64Ptr(50)}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, false, nil, "", false)
	fm := make(map[string]string)
	for _, f := range params.Filters {
		fm[f.Name] = f.Args
	}
	if fm["proportion"] != "50" {
		t.Errorf("proportion = %q, want 50", fm["proportion"])
	}
}

func TestConvertToImagorParams_ProportionBakedInPreview(t *testing.T) {
	state := Transformations{Width: intPtr(800), Height: intPtr(600), Proportion: float64Ptr(50)}
	previewMax := &Dimensions{Width: 1000, Height: 1000}
	params := ConvertToImagorParams(state, Dimensions{800, 600}, nil, true, previewMax, "", false)
	for _, f := range params.Filters {
		if f.Name == "proportion" {
			t.Error("proportion should be baked in, not emitted as a filter")
		}
	}
	if params.Width != 400 || params.Height != 300 {
		t.Errorf("dims = %dx%d, want 400x300", params.Width, params.Height)
	}
}

func TestConvertToImagorParams_LayerNoTransformsPreview(t *testing.T) {
	// A layer with no transforms and a 0.5 preview scale must NOT double-scale
	// the layer dimensions: buildLayerInlinePath stores raw origDims and lets
	// buildLayerParams apply scaleFactor exactly once.
	ip := "layer.jpg"
	layer := &Layer{
		ID: "l1", Type: "image", Visible: true,
		ImagePath:          &ip,
		OriginalDimensions: &Dimensions{Width: 200, Height: 100},
	}
	state := Transformations{
		Width: intPtr(400), Height: intPtr(200),
		Layers: []*Layer{layer},
	}
	previewMax := &Dimensions{Width: 200, Height: 100}
	params := ConvertToImagorParams(state, Dimensions{400, 200}, nil, true, previewMax, "", false)
	// scaleFactor = 0.5; layer should be 100x50, not 50x25 (double-scaled)
	found := false
	for _, f := range params.Filters {
		if f.Name == "image" {
			// path segment starts with /100x50/
			if len(f.Args) < 7 || f.Args[:7] != "/100x50" {
				t.Errorf("layer path = %q, want prefix /100x50", f.Args)
			}
			found = true
		}
	}
	if !found {
		t.Error("no image filter found")
	}
}

func TestConvertToImagorParams_PaddingWithoutFillColor(t *testing.T) {
	// Padding should be emitted even when FillColor is nil (matches TS behaviour)
	pv := 10
	state := Transformations{
		Width: intPtr(200), Height: intPtr(200),
		PaddingTop: &pv, PaddingLeft: &pv,
	}
	params := ConvertToImagorParams(state, Dimensions{200, 200}, nil, false, nil, "", false)
	if params.PaddingTop != 10 || params.PaddingLeft != 10 {
		t.Errorf("paddingTop=%d paddingLeft=%d, want 10 10", params.PaddingTop, params.PaddingLeft)
	}
}

func TestBuildTextFilter_Nil(t *testing.T) {
	if f := buildTextFilter(&Layer{Type: "text"}, 1.0); f != nil {
		t.Errorf("expected nil, got %+v", f)
	}
}

func TestBuildTextFilter_Empty(t *testing.T) {
	if f := buildTextFilter(&Layer{Type: "text", Text: strPtr("   ")}, 1.0); f != nil {
		t.Errorf("expected nil for whitespace, got %+v", f)
	}
}

func TestBuildTextFilter_SimpleDefaults(t *testing.T) {
	layer := &Layer{
		Type: "text", Text: strPtr("hello"),
		X: rawJSON(10), Y: rawJSON(20),
	}
	f := buildTextFilter(layer, 1.0)
	if f == nil {
		t.Fatal("expected non-nil filter")
	}
	if f.Name != "text" {
		t.Errorf("name = %q, want text", f.Name)
	}
	if f.Args != "hello,10,20" {
		t.Errorf("args = %q, want hello,10,20", f.Args)
	}
}

func TestBuildTextFilter_ScaleFactor(t *testing.T) {
	layer := &Layer{
		Type: "text", Text: strPtr("test"),
		X: rawJSON(100), Y: rawJSON(50),
		FontSize: float64Ptr(20),
	}
	f := buildTextFilter(layer, 0.5)
	if f == nil {
		t.Fatal("expected non-nil filter")
	}
	_ = f.Args
}

func TestConvertToImagorParams_VisualCropPreview_LayerContext(t *testing.T) {
	// Simulates the real-world case from the bug report:
	// contextPath = ["layer-id"], forPreview = true, visualCropEnabled on ROOT only.
	// The layer's own transforms do NOT carry visualCropEnabled, so the resolver
	// must pass base.IsVisualCropEnabled() explicitly to ConvertToImagorParams.
	layerIP := "Google Photos/IMG_20180109_120647-EFFECTS.jpg"
	fillColor := "ffffff"
	hAlign := "left"
	vAlign := "top"
	layerTransforms := Transformations{
		Width: intPtr(1916), Height: intPtr(2988),
		FitIn:     boolPtr(true),
		Smart:     boolPtr(true),
		FillColor: &fillColor,
		HAlign:    &hAlign,
		VAlign:    &vAlign,
		CropLeft:  float64Ptr(0), CropTop: float64Ptr(0),
		CropWidth: float64Ptr(4608), CropHeight: float64Ptr(3456),
	}
	layer := &Layer{
		ID: "layer-1773508964915", Type: "image", Visible: true,
		ImagePath:          &layerIP,
		OriginalDimensions: &Dimensions{Width: 4608, Height: 3456},
		Transforms:         &layerTransforms,
	}
	// Root has visualCropEnabled=true; layer transforms do NOT.
	base := Transformations{
		Width: intPtr(5312), Height: intPtr(2988),
		VisualCropEnabled: boolPtr(true),
		Layers:            []*Layer{layer},
	}
	origDims := Dimensions{Width: 5312, Height: 2988}
	baseImagePath := "Google Photos/IMG_20160731_114223.jpg"

	// Resolve to layer context (mirrors what the resolver does).
	res := ResolveContext(base, origDims, baseImagePath, []string{"layer-1773508964915"})

	// The layer's own transforms don't have visualCropEnabled, but the root does.
	// Pass base.IsVisualCropEnabled() as the isVisualCrop argument.
	params := ConvertToImagorParams(*res.Transforms, res.OrigDims, res.ParentDims, true, nil, "", base.IsVisualCropEnabled())

	// Crop must be suppressed.
	if params.CropRight != 0 {
		t.Error("crop should be suppressed in visual-crop preview mode for layer context")
	}
	// FitIn must be suppressed.
	if params.FitIn {
		t.Error("FitIn should be suppressed in visual-crop preview mode for layer context")
	}
	// Smart must be suppressed.
	if params.Smart {
		t.Error("Smart should be suppressed in visual-crop preview mode for layer context")
	}
	// fill filter must be suppressed.
	for _, f := range params.Filters {
		if f.Name == "fill" {
			t.Error("fill filter should be suppressed in visual-crop preview mode for layer context")
		}
	}
}

func TestApplyTemplateToImage_AdaptiveSameDims(t *testing.T) {
	// Adaptive mode, same dimensions → crop preserved, width/height set to targetDims
	cropL, cropT, cropW, cropH := 10.0, 20.0, 300.0, 200.0
	tmpl := Template{
		DimensionMode:  "adaptive",
		PredefinedDims: &Dimensions{Width: 800, Height: 600},
		Transformations: Transformations{
			Width: intPtr(800), Height: intPtr(600),
			CropLeft: &cropL, CropTop: &cropT, CropWidth: &cropW, CropHeight: &cropH,
		},
	}
	target := Dimensions{Width: 800, Height: 600}
	result := ApplyTemplateToImage(tmpl, "bucket/photo.jpg", target)
	state := result.Transformations

	// Crop should be preserved (same dimensions)
	if state.CropLeft == nil || *state.CropLeft != cropL {
		t.Errorf("CropLeft = %v, want %v", state.CropLeft, cropL)
	}
	if state.CropTop == nil || *state.CropTop != cropT {
		t.Errorf("CropTop = %v, want %v", state.CropTop, cropT)
	}
	// Adaptive: width/height set to targetDims
	if state.Width == nil || *state.Width != 800 {
		t.Errorf("Width = %v, want 800", state.Width)
	}
	if state.Height == nil || *state.Height != 600 {
		t.Errorf("Height = %v, want 600", state.Height)
	}
	// OriginalDimensions set to targetDims
	if state.OriginalDimensions == nil || *state.OriginalDimensions != target {
		t.Errorf("OriginalDimensions = %v, want %v", state.OriginalDimensions, target)
	}
	// ImagePath set on transformations
	if state.ImagePath == nil || *state.ImagePath != "bucket/photo.jpg" {
		t.Errorf("ImagePath = %v, want bucket/photo.jpg", state.ImagePath)
	}
	// SourceImagePath set on template
	if result.SourceImagePath != "bucket/photo.jpg" {
		t.Errorf("SourceImagePath = %q, want bucket/photo.jpg", result.SourceImagePath)
	}
}

func TestApplyTemplateToImage_AdaptiveDifferentDims(t *testing.T) {
	// Adaptive mode, different dimensions → crop stripped, width/height set to targetDims
	cropL, cropT, cropW, cropH := 10.0, 20.0, 300.0, 200.0
	tmpl := Template{
		DimensionMode:  "adaptive",
		PredefinedDims: &Dimensions{Width: 800, Height: 600},
		Transformations: Transformations{
			Width: intPtr(800), Height: intPtr(600),
			CropLeft: &cropL, CropTop: &cropT, CropWidth: &cropW, CropHeight: &cropH,
		},
	}
	target := Dimensions{Width: 1920, Height: 1080}
	result := ApplyTemplateToImage(tmpl, "bucket/new.jpg", target)
	state := result.Transformations

	// Crop should be stripped (different dimensions)
	if state.CropLeft != nil || state.CropTop != nil || state.CropWidth != nil || state.CropHeight != nil {
		t.Error("crop fields should be nil for different dimensions")
	}
	// Adaptive: width/height set to targetDims
	if state.Width == nil || *state.Width != 1920 {
		t.Errorf("Width = %v, want 1920", state.Width)
	}
	if state.Height == nil || *state.Height != 1080 {
		t.Errorf("Height = %v, want 1080", state.Height)
	}
	// OriginalDimensions set to targetDims
	if state.OriginalDimensions == nil || *state.OriginalDimensions != target {
		t.Errorf("OriginalDimensions = %v, want %v", state.OriginalDimensions, target)
	}
	// ImagePath and SourceImagePath set
	if state.ImagePath == nil || *state.ImagePath != "bucket/new.jpg" {
		t.Errorf("ImagePath = %v, want bucket/new.jpg", state.ImagePath)
	}
	if result.SourceImagePath != "bucket/new.jpg" {
		t.Errorf("SourceImagePath = %q, want bucket/new.jpg", result.SourceImagePath)
	}
}

func TestApplyTemplateToImage_PredefinedSameDims(t *testing.T) {
	// Predefined mode, same dimensions → crop preserved, width/height kept from template
	cropL, cropT, cropW, cropH := 0.0, 0.0, 400.0, 300.0
	tmpl := Template{
		DimensionMode:  "predefined",
		PredefinedDims: &Dimensions{Width: 800, Height: 600},
		Transformations: Transformations{
			Width: intPtr(400), Height: intPtr(300),
			CropLeft: &cropL, CropTop: &cropT, CropWidth: &cropW, CropHeight: &cropH,
		},
	}
	target := Dimensions{Width: 800, Height: 600}
	result := ApplyTemplateToImage(tmpl, "bucket/photo.jpg", target)
	state := result.Transformations

	// Crop preserved (same dimensions)
	if state.CropLeft == nil {
		t.Error("CropLeft should be preserved for same dimensions")
	}
	// Predefined: keep template's width/height (400x300, not 800x600)
	if state.Width == nil || *state.Width != 400 {
		t.Errorf("Width = %v, want 400 (template's output size)", state.Width)
	}
	if state.Height == nil || *state.Height != 300 {
		t.Errorf("Height = %v, want 300 (template's output size)", state.Height)
	}
	// OriginalDimensions set to targetDims
	if state.OriginalDimensions == nil || *state.OriginalDimensions != target {
		t.Errorf("OriginalDimensions = %v, want %v", state.OriginalDimensions, target)
	}
}

func TestApplyTemplateToImage_PredefinedDifferentDims(t *testing.T) {
	// Predefined mode, different dimensions → crop stripped, width/height kept from template
	cropL, cropT, cropW, cropH := 10.0, 10.0, 200.0, 150.0
	tmpl := Template{
		DimensionMode:  "predefined",
		PredefinedDims: &Dimensions{Width: 800, Height: 600},
		Transformations: Transformations{
			Width: intPtr(1280), Height: intPtr(720),
			CropLeft: &cropL, CropTop: &cropT, CropWidth: &cropW, CropHeight: &cropH,
		},
	}
	target := Dimensions{Width: 1920, Height: 1080}
	result := ApplyTemplateToImage(tmpl, "bucket/photo.jpg", target)
	state := result.Transformations

	// Crop stripped (different dimensions)
	if state.CropLeft != nil || state.CropTop != nil {
		t.Error("crop fields should be nil for different dimensions")
	}
	// Predefined: keep template's width/height
	if state.Width == nil || *state.Width != 1280 {
		t.Errorf("Width = %v, want 1280", state.Width)
	}
	if state.Height == nil || *state.Height != 720 {
		t.Errorf("Height = %v, want 720", state.Height)
	}
	// OriginalDimensions set to targetDims
	if state.OriginalDimensions == nil || *state.OriginalDimensions != target {
		t.Errorf("OriginalDimensions = %v, want %v", state.OriginalDimensions, target)
	}
}

func TestApplyTemplateToImage_NoPredefinedDims(t *testing.T) {
	// No predefinedDimensions in template → crop always stripped
	cropL, cropT, cropW, cropH := 10.0, 10.0, 200.0, 150.0
	tmpl := Template{
		DimensionMode:  "adaptive",
		PredefinedDims: nil, // no predefined dims
		Transformations: Transformations{
			CropLeft: &cropL, CropTop: &cropT, CropWidth: &cropW, CropHeight: &cropH,
		},
	}
	target := Dimensions{Width: 800, Height: 600}
	result := ApplyTemplateToImage(tmpl, "bucket/photo.jpg", target)
	state := result.Transformations

	// Crop stripped (no predefined dims to compare against)
	if state.CropLeft != nil || state.CropTop != nil {
		t.Error("crop fields should be nil when no predefinedDimensions")
	}
	// OriginalDimensions set to targetDims
	if state.OriginalDimensions == nil || *state.OriginalDimensions != target {
		t.Errorf("OriginalDimensions = %v, want %v", state.OriginalDimensions, target)
	}
}

func TestApplyTemplateToImage_PreservesOtherTransforms(t *testing.T) {
	// Other transformations (brightness, layers, etc.) should be preserved
	brightness := 20.0
	tmpl := Template{
		DimensionMode:  "adaptive",
		PredefinedDims: &Dimensions{Width: 800, Height: 600},
		Transformations: Transformations{
			Brightness: &brightness,
			FitIn:      boolPtr(true),
		},
	}
	target := Dimensions{Width: 1920, Height: 1080}
	result := ApplyTemplateToImage(tmpl, "bucket/photo.jpg", target)
	state := result.Transformations

	if state.Brightness == nil || *state.Brightness != brightness {
		t.Errorf("Brightness = %v, want %v", state.Brightness, brightness)
	}
	if state.FitIn == nil || !*state.FitIn {
		t.Error("FitIn should be preserved")
	}
}
