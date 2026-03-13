package resolver

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"

	"github.com/cshum/imagor/imagorpath"
)

// ─── position / text-width helpers ──────────────────────────────────────────

var alignmentOffsetRe = regexp.MustCompile(`^(left|right|top|bottom|l|r|t|b)-(\d+)$`)
var fInsetRe = regexp.MustCompile(`^(?:f|full)-(\d+)$`)

// scalePositionValue scales a position JSON value (number or string) by scaleFactor.
// Mirrors the TypeScript ImageEditor.scalePositionValue static method.
func scalePositionValue(raw json.RawMessage, scaleFactor float64) string {
	if len(raw) == 0 {
		return "0"
	}
	// Numeric
	var n float64
	if err := json.Unmarshal(raw, &n); err == nil {
		scaled := int(math.Round(n * scaleFactor))
		return fmt.Sprintf("%d", scaled)
	}
	// String
	var s string
	if err := json.Unmarshal(raw, &s); err != nil || s == "" {
		return "0"
	}
	if scaleFactor == 1.0 {
		return s
	}
	if m := alignmentOffsetRe.FindStringSubmatch(s); m != nil {
		offset, _ := strconv.Atoi(m[2])
		scaled := int(math.Round(float64(offset) * scaleFactor))
		return fmt.Sprintf("%s-%d", m[1], scaled)
	}
	return s
}

// scaleTextWidth scales a text-layer wrap-width value (number or "f-N" string).
// Mirrors the frontend's scaling of layer.width in convertStateToGraphQLParams.
func scaleTextWidth(raw json.RawMessage, scaleFactor float64) string {
	if len(raw) == 0 {
		return "0"
	}
	var n float64
	if err := json.Unmarshal(raw, &n); err == nil {
		if n <= 0 {
			return "0"
		}
		return fmt.Sprintf("%d", int(math.Round(n*scaleFactor)))
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return "0"
	}
	if scaleFactor == 1.0 {
		return s
	}
	if m := fInsetRe.FindStringSubmatch(s); m != nil {
		inset, _ := strconv.Atoi(m[1])
		scaled := int(math.Round(float64(inset) * scaleFactor))
		if scaled == 0 {
			return "f"
		}
		return fmt.Sprintf("f-%d", scaled)
	}
	return s
}

// encodeTextToBase64url encodes text for use in the text() filter.
// Mirrors ImageEditor.encodeTextToBase64url: pass through simple identifiers,
// otherwise base64url-encode with "b64:" prefix.
var simpleTextRe = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

func encodeTextToBase64url(text string) string {
	if simpleTextRe.MatchString(text) {
		return text
	}
	encoded := base64.RawURLEncoding.EncodeToString([]byte(text))
	return "b64:" + encoded
}

// ─── base64 path encoding ────────────────────────────────────────────────────

var reservedPathPrefixes = []string{
	"trim/", "meta/", "fit-in/", "stretch/",
	"top/", "left/", "right/", "bottom/", "center/", "smart/",
}

// needsBase64Encoding returns true when the image path must be base64-encoded
// to avoid being misinterpreted by the imagor URL parser.
// Matches the frontend's ImageEditor.needsBase64Encoding logic (including comma check
// which matters for paths embedded in image() filter args).
func needsBase64Encoding(imagePath string) bool {
	if strings.ContainsAny(imagePath, " ?#&(),") {
		return true
	}
	for _, p := range reservedPathPrefixes {
		if strings.HasPrefix(imagePath, p) {
			return true
		}
	}
	return false
}

// ─── dimension computation ───────────────────────────────────────────────────

// computeOutputDims calculates the output dimensions of a canvas after applying
// crop → resize → padding → rotation.  Mirrors computeOutputDimensionsFromState.
func computeOutputDims(state EditorState, origDims Dimensions, parentDims *Dimensions) Dimensions {
	var srcW, srcH int
	if state.hasCropParams() {
		srcW = int(*state.CropWidth)
		srcH = int(*state.CropHeight)
	} else {
		srcW = origDims.Width
		srcH = origDims.Height
	}

	// Resolve fill-mode (f-token) dimensions
	var outW, outH int
	if state.WidthFull && parentDims != nil {
		offset := intPtrVal(state.WidthFullOffset)
		outW = maxInt(1, parentDims.Width-offset)
	} else if state.Width != nil {
		outW = *state.Width
	} else {
		outW = srcW
	}
	if state.HeightFull && parentDims != nil {
		offset := intPtrVal(state.HeightFullOffset)
		outH = maxInt(1, parentDims.Height-offset)
	} else if state.Height != nil {
		outH = *state.Height
	} else {
		outH = srcH
	}

	var finalW, finalH int
	if boolPtrVal(state.FitIn, false) {
		scale := math.Min(
			math.Min(float64(outW)/float64(srcW), float64(outH)/float64(srcH)),
			1.0,
		)
		finalW = int(math.Round(float64(srcW) * scale))
		finalH = int(math.Round(float64(srcH) * scale))
	} else {
		finalW = outW
		finalH = outH
	}

	// Padding (only when fill colour is defined)
	if state.FillColor != nil {
		finalW += intPtrVal(state.PaddingLeft) + intPtrVal(state.PaddingRight)
		finalH += intPtrVal(state.PaddingTop) + intPtrVal(state.PaddingBottom)
	}

	// Rotation swaps axes
	if state.Rotation != nil && (*state.Rotation == 90 || *state.Rotation == 270) {
		return Dimensions{Width: finalH, Height: finalW}
	}
	return Dimensions{Width: finalW, Height: finalH}
}

// ─── context traversal ───────────────────────────────────────────────────────

// contextResolution holds the resolved active state for URL generation.
type contextResolution struct {
	State      EditorState
	ImagePath  string
	OrigDims   Dimensions
	ParentDims *Dimensions // nil at root
}

// resolveContextState walks contextPath through the base state's layer tree and
// returns the active state to render, its image path, its original dimensions,
// and the parent canvas dimensions needed for f-token resolution.
//
// contextPath = [] → render the root canvas (base state, baseImagePath).
// contextPath = ["layer-1"] → render layer-1's transforms against root canvas.
// contextPath = ["layer-1", "nested-2"] → render nested-2 inside layer-1.
func resolveContextState(base EditorState, baseOrigDims Dimensions, baseImagePath string, contextPath []string) contextResolution {
	if len(contextPath) == 0 {
		return contextResolution{
			State:      base,
			ImagePath:  baseImagePath,
			OrigDims:   baseOrigDims,
			ParentDims: nil,
		}
	}

	// Root canvas output dims become the initial "parent" for depth-0 layers
	rootOutDims := computeOutputDims(base, baseOrigDims, nil)
	lastParentDims := rootOutDims

	currentLayers := base.Layers

	for i, layerID := range contextPath {
		var found *EditorLayer
		for _, l := range currentLayers {
			if l.ID == layerID {
				found = l
				break
			}
		}
		if found == nil {
			// Layer not found — fall back to root
			return contextResolution{State: base, ImagePath: baseImagePath, OrigDims: baseOrigDims}
		}

		if i == len(contextPath)-1 {
			// This IS the target layer
			res := contextResolution{ParentDims: &lastParentDims}
			if found.Transforms != nil {
				res.State = *found.Transforms
			}
			if found.ImagePath != nil {
				res.ImagePath = *found.ImagePath
			}
			if found.OriginalDimensions != nil {
				res.OrigDims = *found.OriginalDimensions
			}
			return res
		}

		// Not the last — compute this ancestor's output dims and descend
		layerState := EditorState{}
		if found.Transforms != nil {
			layerState = *found.Transforms
		}
		layerOrigDims := Dimensions{Width: 1, Height: 1}
		if found.OriginalDimensions != nil {
			layerOrigDims = *found.OriginalDimensions
		}
		lastParentDims = computeOutputDims(layerState, layerOrigDims, &lastParentDims)

		currentLayers = nil
		if found.Transforms != nil {
			currentLayers = found.Transforms.Layers
		}
	}

	return contextResolution{State: base, ImagePath: baseImagePath, OrigDims: baseOrigDims}
}

// ─── layer inline-path builder ───────────────────────────────────────────────

// buildLayerParams builds imagorpath.Params for a layer image to embed in the
// image() filter arg.  Mirrors ImageEditor.editorStateToImagorPath (static method)
// which is used for layer sub-paths in both editorStateToImagorPath and
// convertStateToGraphQLParams.
//
// proportion is NOT included (global-only).
// format/quality/maxBytes are included only when forPreview is false.
func buildLayerParams(state EditorState, imagePath string, origDims Dimensions, scaleFactor float64, forPreview bool) imagorpath.Params {
	params := imagorpath.Params{}

	// ── crop ────────────────────────────────────────────────────────────────
	// Layer crops are not skipped even in preview (visualCropEnabled is an outer canvas thing)
	if state.hasCropParams() {
		params.CropLeft = *state.CropLeft
		params.CropTop = *state.CropTop
		params.CropRight = *state.CropLeft + *state.CropWidth
		params.CropBottom = *state.CropTop + *state.CropHeight
	}

	// ── dimensions + flip ───────────────────────────────────────────────────
	if state.Width != nil || state.Height != nil || state.WidthFull || state.HeightFull {
		hFlip := boolPtrVal(state.HFlip, false)
		vFlip := boolPtrVal(state.VFlip, false)

		if state.WidthFull {
			// f-tokens are embedded literally in the layer path (imagor resolves them)
			offset := intPtrVal(state.WidthFullOffset)
			var wStr string
			if offset > 0 {
				wStr = fmt.Sprintf("f-%d", int(math.Round(float64(offset)*scaleFactor)))
			} else {
				wStr = "f"
			}
			if hFlip {
				wStr = "-" + wStr
			}
			params.FullFitIn = false // use raw f-token — set via Filters below if needed
			// NOTE: imagorpath doesn't support f-tokens natively; we inject them as
			// the Width/Height fields encoded via a special approach.  imagor parses
			// the path string, so we will rely on buildLayerInlinePath (below) which
			// calls GenerateUnsafe *after* we construct a partial path manually.
			_ = wStr // handled in buildLayerInlinePath
		} else {
			w := 0
			if state.Width != nil {
				w = int(math.Round(float64(*state.Width) * scaleFactor))
			}
			if hFlip {
				w = -w
			}
			params.Width = w
		}

		if state.HeightFull {
			// Same f-token handling — delegated to buildLayerInlinePath
		} else {
			h := 0
			if state.Height != nil {
				h = int(math.Round(float64(*state.Height) * scaleFactor))
			}
			if vFlip {
				h = -h
			}
			params.Height = h
		}

		params.FitIn = boolPtrVal(state.FitIn, false)
		params.Stretch = boolPtrVal(state.Stretch, false)
	}

	// ── padding ─────────────────────────────────────────────────────────────
	if state.FillColor != nil {
		pTop := int(math.Round(float64(intPtrVal(state.PaddingTop)) * scaleFactor))
		pRight := int(math.Round(float64(intPtrVal(state.PaddingRight)) * scaleFactor))
		pBottom := int(math.Round(float64(intPtrVal(state.PaddingBottom)) * scaleFactor))
		pLeft := int(math.Round(float64(intPtrVal(state.PaddingLeft)) * scaleFactor))
		if pTop > 0 || pRight > 0 || pBottom > 0 || pLeft > 0 {
			params.PaddingTop = pTop
			params.PaddingRight = pRight
			params.PaddingBottom = pBottom
			params.PaddingLeft = pLeft
		}
	}

	// ── alignment ───────────────────────────────────────────────────────────
	if !boolPtrVal(state.FitIn, false) && !boolPtrVal(state.Smart, false) {
		if state.HAlign != nil {
			params.HAlign = *state.HAlign
		}
		if state.VAlign != nil {
			params.VAlign = *state.VAlign
		}
	}
	if boolPtrVal(state.Smart, false) {
		params.Smart = true
	}

	// ── filters ─────────────────────────────────────────────────────────────
	var filters imagorpath.Filters

	if v := float64PtrVal(state.Brightness); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "brightness", Args: fmtFloat(v)})
	}
	if v := float64PtrVal(state.Contrast); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "contrast", Args: fmtFloat(v)})
	}
	if v := float64PtrVal(state.Saturation); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "saturation", Args: fmtFloat(v)})
	}
	if v := float64PtrVal(state.Hue); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "hue", Args: fmtFloat(v)})
	}
	if boolPtrVal(state.Grayscale, false) {
		filters = append(filters, imagorpath.Filter{Name: "grayscale", Args: ""})
	}
	if v := float64PtrVal(state.Blur); v != 0 {
		scaled := math.Round(v*scaleFactor*100) / 100
		filters = append(filters, imagorpath.Filter{Name: "blur", Args: fmtFloat(scaled)})
	}
	if v := float64PtrVal(state.Sharpen); v != 0 {
		scaled := math.Round(v*scaleFactor*100) / 100
		filters = append(filters, imagorpath.Filter{Name: "sharpen", Args: fmtFloat(scaled)})
	}
	if v := float64PtrVal(state.RoundCornerRadius); v > 0 {
		scaled := int(math.Round(v * scaleFactor))
		filters = append(filters, imagorpath.Filter{Name: "round_corner", Args: strconv.Itoa(scaled)})
	}
	if state.FillColor != nil && *state.FillColor != "" {
		filters = append(filters, imagorpath.Filter{Name: "fill", Args: *state.FillColor})
	}
	if state.Rotation != nil && *state.Rotation != 0 {
		filters = append(filters, imagorpath.Filter{Name: "rotate", Args: strconv.Itoa(*state.Rotation)})
	}

	// Nested layers — build image() filters recursively
	for _, layer := range state.Layers {
		if !layer.Visible {
			continue
		}
		if layer.Type == "text" {
			f := buildTextFilter(layer, scaleFactor)
			if f != nil {
				filters = append(filters, *f)
			}
			continue
		}
		// ImageLayer
		layerPath := buildLayerInlinePath(layer, scaleFactor, forPreview)
		x := scalePositionValue(layer.X, scaleFactor)
		y := scalePositionValue(layer.Y, scaleFactor)
		args := fmt.Sprintf("%s,%s,%s", layerPath, x, y)
		if layer.Alpha != 0 || layer.BlendMode != "normal" {
			args += fmt.Sprintf(",%d", layer.Alpha)
			if layer.BlendMode != "normal" {
				args += "," + layer.BlendMode
			}
		}
		filters = append(filters, imagorpath.Filter{Name: "image", Args: args})
	}

	// format/quality/maxBytes for non-preview layer paths
	if !forPreview {
		if state.Format != nil && *state.Format != "" {
			filters = append(filters, imagorpath.Filter{Name: "format", Args: *state.Format})
			if state.Quality != nil {
				filters = append(filters, imagorpath.Filter{Name: "quality", Args: strconv.Itoa(*state.Quality)})
			}
		}
		if state.MaxBytes != nil && (state.Format != nil || state.Quality != nil) {
			filters = append(filters, imagorpath.Filter{Name: "max_bytes", Args: strconv.Itoa(*state.MaxBytes)})
		}
	}
	if state.StripIcc != nil && *state.StripIcc {
		filters = append(filters, imagorpath.Filter{Name: "strip_icc", Args: ""})
	}
	if state.StripExif != nil && *state.StripExif {
		filters = append(filters, imagorpath.Filter{Name: "strip_exif", Args: ""})
	}

	if len(filters) > 0 {
		params.Filters = filters
	}

	// Image path + base64 encoding flag
	params.Image = imagePath
	if needsBase64Encoding(imagePath) {
		params.Base64Image = true
	}

	return params
}

// buildLayerInlinePath generates the raw imagor path string for embedding in an
// image() filter arg.  It handles f-token dimensions manually because
// imagorpath.GenerateUnsafe does not support f-tokens natively.
func buildLayerInlinePath(layer *EditorLayer, scaleFactor float64, forPreview bool) string {
	if layer.ImagePath == nil {
		return "/0x0/color:none"
	}
	imagePath := *layer.ImagePath
	origDims := Dimensions{Width: 1, Height: 1}
	if layer.OriginalDimensions != nil {
		origDims = *layer.OriginalDimensions
	}

	layerState := EditorState{}
	if layer.Transforms != nil {
		// Strip proportion — it is global-only and must not appear in sub-paths
		layerState = *layer.Transforms
		layerState.Proportion = nil
	} else {
		// No transforms: use original dimensions at the given scale
		w := int(math.Round(float64(origDims.Width) * scaleFactor))
		h := int(math.Round(float64(origDims.Height) * scaleFactor))
		layerState = EditorState{Width: &w, Height: &h}
	}

	// Handle f-token dimensions by building the path manually
	if layerState.WidthFull || layerState.HeightFull {
		return buildFTokenLayerPath(layerState, imagePath, scaleFactor, forPreview)
	}

	params := buildLayerParams(layerState, imagePath, origDims, scaleFactor, forPreview)
	raw := imagorpath.GenerateUnsafe(params)
	// GenerateUnsafe returns "unsafe/<path>" — strip the "unsafe/" prefix and prepend "/"
	path := strings.TrimPrefix(raw, "unsafe/")
	return "/" + path
}

// buildFTokenLayerPath builds the inline path for layers that use f-token dimensions.
// imagorpath does not support f-tokens natively so we assemble the path manually.
func buildFTokenLayerPath(state EditorState, imagePath string, scaleFactor float64, forPreview bool) string {
	parts := []string{}

	// Crop
	if state.hasCropParams() {
		right := *state.CropLeft + *state.CropWidth
		bottom := *state.CropTop + *state.CropHeight
		parts = append(parts, fmt.Sprintf("%gx%g:%gx%g", *state.CropLeft, *state.CropTop, right, bottom))
	}

	// Dimensions with f-tokens
	var prefix string
	if boolPtrVal(state.Stretch, false) {
		prefix = "stretch/"
	} else if boolPtrVal(state.FitIn, false) {
		prefix = "fit-in/"
	}

	hFlip := boolPtrVal(state.HFlip, false)
	vFlip := boolPtrVal(state.VFlip, false)

	var wStr, hStr string
	if state.WidthFull {
		offset := intPtrVal(state.WidthFullOffset)
		if offset > 0 {
			wStr = fmt.Sprintf("f-%d", int(math.Round(float64(offset)*scaleFactor)))
		} else {
			wStr = "f"
		}
		if hFlip {
			wStr = "-" + wStr
		}
	} else {
		w := 0
		if state.Width != nil {
			w = int(math.Round(float64(*state.Width) * scaleFactor))
		}
		if hFlip {
			w = -w
		}
		wStr = strconv.Itoa(w)
	}

	if state.HeightFull {
		offset := intPtrVal(state.HeightFullOffset)
		if offset > 0 {
			hStr = fmt.Sprintf("f-%d", int(math.Round(float64(offset)*scaleFactor)))
		} else {
			hStr = "f"
		}
		if vFlip {
			hStr = "-" + hStr
		}
	} else {
		h := 0
		if state.Height != nil {
			h = int(math.Round(float64(*state.Height) * scaleFactor))
		}
		if vFlip {
			h = -h
		}
		hStr = strconv.Itoa(h)
	}
	parts = append(parts, fmt.Sprintf("%s%sx%s", prefix, wStr, hStr))

	// Alignment
	if !boolPtrVal(state.FitIn, false) && !boolPtrVal(state.Smart, false) {
		if state.HAlign != nil {
			parts = append(parts, *state.HAlign)
		}
		if state.VAlign != nil {
			parts = append(parts, *state.VAlign)
		}
	}
	if boolPtrVal(state.Smart, false) {
		parts = append(parts, "smart")
	}

	// Build filters string reusing buildLayerParams (which ignores f-tokens since
	// Width/Height are zero in this branch — f-token dims are handled above)
	origDims := Dimensions{Width: 1, Height: 1}
	paramsCopy := buildLayerParams(state, imagePath, origDims, scaleFactor, forPreview)
	// Override image path handling
	paramsCopy.Width = 0
	paramsCopy.Height = 0

	// Encode image path if needed
	finalImagePath := imagePath
	if needsBase64Encoding(imagePath) {
		finalImagePath = "b64:" + base64.RawURLEncoding.EncodeToString([]byte(imagePath))
	}

	if len(paramsCopy.Filters) > 0 {
		filterStrs := make([]string, len(paramsCopy.Filters))
		for i, f := range paramsCopy.Filters {
			if f.Args == "" {
				filterStrs[i] = f.Name + "()"
			} else {
				filterStrs[i] = fmt.Sprintf("%s(%s)", f.Name, f.Args)
			}
		}
		parts = append(parts, "filters:"+strings.Join(filterStrs, ":"))
	}
	parts = append(parts, finalImagePath)
	return "/" + strings.Join(parts, "/")
}

// buildTextFilter builds the text() filter for a TextLayer.
// Returns nil if the text is empty.
func buildTextFilter(layer *EditorLayer, scaleFactor float64) *imagorpath.Filter {
	if layer.Text == nil || strings.TrimSpace(*layer.Text) == "" {
		return nil
	}
	encodedText := encodeTextToBase64url(*layer.Text)
	x := scalePositionValue(layer.X, scaleFactor)
	y := scalePositionValue(layer.Y, scaleFactor)

	// Font: "family[ style] size" with spaces → hyphens
	fontSize := 20.0
	if layer.FontSize != nil {
		fontSize = *layer.FontSize
	}
	scaledSize := int(math.Max(1, math.Round(fontSize*scaleFactor)))
	fontParts := []string{}
	if layer.Font != nil && *layer.Font != "" {
		fontParts = append(fontParts, *layer.Font)
	}
	if layer.FontStyle != nil && *layer.FontStyle != "" {
		fontParts = append(fontParts, *layer.FontStyle)
	}
	fontParts = append(fontParts, strconv.Itoa(scaledSize))
	font := strings.ReplaceAll(strings.Join(fontParts, " "), " ", "-")

	color := "000000"
	if layer.Color != nil && *layer.Color != "" {
		color = *layer.Color
	}
	alpha := layer.Alpha
	blendMode := layer.BlendMode
	if blendMode == "" {
		blendMode = "normal"
	}
	width := scaleTextWidth(layer.TextWidth, scaleFactor)
	align := "low"
	if layer.Align != nil {
		align = *layer.Align
	}
	justify := "false"
	if boolPtrVal(layer.Justify, false) {
		justify = "true"
	}
	wrap := "word"
	if layer.Wrap != nil {
		wrap = *layer.Wrap
	}
	spacing := 0
	if layer.Spacing != nil {
		spacing = int(math.Round(*layer.Spacing * scaleFactor))
	}

	// Determine if any non-default optional args are present
	widthNonDefault := width != "0"
	hasNonDefault := font != "sans-20" ||
		color != "000000" ||
		alpha != 0 ||
		blendMode != "normal" ||
		widthNonDefault ||
		align != "low" ||
		justify != "false" ||
		wrap != "word" ||
		spacing != 0

	args := []string{encodedText, x, y}
	if hasNonDefault {
		args = append(args, font, color,
			strconv.Itoa(alpha), blendMode, width, align, justify, wrap,
			strconv.Itoa(spacing),
		)
		if layer.DPI != nil && *layer.DPI != 72 {
			args = append(args, strconv.Itoa(*layer.DPI))
		}

		// Trim trailing defaults (mirrors the TypeScript OPTIONAL_DEFAULTS trimming)
		type defaultVal = string
		optDefaults := []defaultVal{"sans-20", "000000", "0", "normal", "0", "low", "false", "word", "0"}
		for len(args) > 3 {
			optIdx := len(args) - 1 - 3 // 0 = font
			if optIdx < 0 || optIdx >= len(optDefaults) {
				break
			}
			if args[len(args)-1] != optDefaults[optIdx] {
				break
			}
			args = args[:len(args)-1]
		}
	}

	return &imagorpath.Filter{Name: "text", Args: strings.Join(args, ",")}
}

// ─── main converter ──────────────────────────────────────────────────────────

// fmtFloat formats a float64 removing trailing zeros (e.g. 10.0 → "10", 3.14 → "3.14").
func fmtFloat(v float64) string {
	s := strconv.FormatFloat(v, 'f', -1, 64)
	return s
}

// convertEditorStateToImagorParams converts an EditorState to imagorpath.Params.
// This mirrors convertStateToGraphQLParams in the TypeScript frontend.
//
// Parameters:
//   - state       : the active editing state (root canvas or a specific layer's transforms)
//   - origDims    : original dimensions of the image for this state
//   - parentDims  : parent canvas dimensions for f-token resolution (nil = root context)
//   - forPreview  : true → add preview/webp filters, scale blur/sharpen/padding
//   - previewMax  : max dimensions for preview scaling (nil = no constraint)
//   - skipLayerID : layer ID to exclude from rendering (used in text-editing overlay mode)
func convertEditorStateToImagorParams(
	state EditorState,
	origDims Dimensions,
	parentDims *Dimensions,
	forPreview bool,
	previewMax *Dimensions,
	skipLayerID string,
) imagorpath.Params {
	params := imagorpath.Params{}

	// ── visual-crop guard ───────────────────────────────────────────────────
	isVisualCrop := state.isVisualCropEnabled()
	shouldApplyCrop := !forPreview || !isVisualCrop
	shouldApplyPadding := !forPreview || !isVisualCrop
	shouldApplyLayers := !forPreview || !isVisualCrop
	shouldApplyRot := !forPreview || !isVisualCrop
	shouldApplyRoundCorner := !forPreview || !isVisualCrop

	// ── crop ────────────────────────────────────────────────────────────────
	if shouldApplyCrop && state.hasCropParams() {
		params.CropLeft = *state.CropLeft
		params.CropTop = *state.CropTop
		params.CropRight = *state.CropLeft + *state.CropWidth
		params.CropBottom = *state.CropTop + *state.CropHeight
	}

	// ── source dimensions ───────────────────────────────────────────────────
	// (after crop)
	var srcW, srcH int
	if shouldApplyCrop && state.hasCropParams() {
		srcW = int(*state.CropWidth)
		srcH = int(*state.CropHeight)
	} else {
		srcW = origDims.Width
		srcH = origDims.Height
	}

	// ── target dimensions ───────────────────────────────────────────────────
	var width, height *int

	// Resolve f-token dimensions using parent context
	if (state.WidthFull || state.HeightFull) && parentDims != nil {
		if state.WidthFull && width == nil {
			w := maxInt(1, parentDims.Width-intPtrVal(state.WidthFullOffset))
			width = &w
		}
		if state.HeightFull && height == nil {
			h := maxInt(1, parentDims.Height-intPtrVal(state.HeightFullOffset))
			height = &h
		}
	}
	if width == nil {
		width = state.Width
	}
	if height == nil {
		height = state.Height
	}

	// When visual-crop preview: use original dimensions
	if forPreview && isVisualCrop {
		w := origDims.Width
		h := origDims.Height
		width = &w
		height = &h
	}

	// ── compute actual output dimensions ────────────────────────────────────
	outW := ifIntPtr(width, srcW)
	outH := ifIntPtr(height, srcH)

	var actualOutW, actualOutH int
	if boolPtrVal(state.FitIn, false) {
		scale := math.Min(
			math.Min(float64(outW)/float64(srcW), float64(outH)/float64(srcH)),
			1.0,
		)
		actualOutW = int(math.Round(float64(srcW) * scale))
		actualOutH = int(math.Round(float64(srcH) * scale))
	} else {
		actualOutW = outW
		actualOutH = outH
	}

	// ── proportion scale ────────────────────────────────────────────────────
	proportionScale := 1.0
	if state.Proportion != nil && *state.Proportion != 100 {
		proportionScale = *state.Proportion / 100.0
	}
	proportionedW := int(math.Round(float64(actualOutW) * proportionScale))
	proportionedH := int(math.Round(float64(actualOutH) * proportionScale))

	// ── preview scaling ─────────────────────────────────────────────────────
	scaleFactor := 1.0
	proportionBakedIntoPreview := false

	if forPreview && previewMax != nil {
		wScale := float64(previewMax.Width) / float64(proportionedW)
		hScale := float64(previewMax.Height) / float64(proportionedH)
		scale := math.Min(wScale, hScale)

		if scale < 1.0 {
			scaleFactor = scale
			w := int(math.Round(float64(proportionedW) * scale))
			h := int(math.Round(float64(proportionedH) * scale))
			width = &w
			height = &h
		} else {
			width = &proportionedW
			height = &proportionedH
			scaleFactor = 1.0
		}

		if proportionScale != 1.0 {
			proportionBakedIntoPreview = true
			scaleFactor *= proportionScale
		}
	}

	// For non-preview, use actual output dimensions (ensures padding is correct)
	if !forPreview {
		width = &actualOutW
		height = &actualOutH
	}

	if width != nil {
		params.Width = *width
	}
	if height != nil {
		params.Height = *height
	}

	// ── fitting / alignment ─────────────────────────────────────────────────
	if state.FitIn != nil {
		params.FitIn = *state.FitIn
	}
	if state.Stretch != nil {
		params.Stretch = *state.Stretch
	}
	if state.Smart != nil {
		params.Smart = *state.Smart
	}
	if state.HAlign != nil {
		params.HAlign = *state.HAlign
	}
	if state.VAlign != nil {
		params.VAlign = *state.VAlign
	}

	// ── flip ────────────────────────────────────────────────────────────────
	if state.HFlip != nil {
		params.HFlip = *state.HFlip
	}
	if state.VFlip != nil {
		params.VFlip = *state.VFlip
	}

	// ── padding ─────────────────────────────────────────────────────────────
	if shouldApplyPadding && state.FillColor != nil {
		if v := intPtrVal(state.PaddingLeft); v > 0 {
			if forPreview {
				params.PaddingLeft = int(math.Round(float64(v) * scaleFactor))
			} else {
				params.PaddingLeft = v
			}
		}
		if v := intPtrVal(state.PaddingTop); v > 0 {
			if forPreview {
				params.PaddingTop = int(math.Round(float64(v) * scaleFactor))
			} else {
				params.PaddingTop = v
			}
		}
		if v := intPtrVal(state.PaddingRight); v > 0 {
			if forPreview {
				params.PaddingRight = int(math.Round(float64(v) * scaleFactor))
			} else {
				params.PaddingRight = v
			}
		}
		if v := intPtrVal(state.PaddingBottom); v > 0 {
			if forPreview {
				params.PaddingBottom = int(math.Round(float64(v) * scaleFactor))
			} else {
				params.PaddingBottom = v
			}
		}
	}

	// ── filters ─────────────────────────────────────────────────────────────
	var filters imagorpath.Filters

	if v := float64PtrVal(state.Brightness); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "brightness", Args: fmtFloat(v)})
	}
	if v := float64PtrVal(state.Contrast); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "contrast", Args: fmtFloat(v)})
	}
	if v := float64PtrVal(state.Saturation); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "saturation", Args: fmtFloat(v)})
	}
	if v := float64PtrVal(state.Hue); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "hue", Args: fmtFloat(v)})
	}
	if boolPtrVal(state.Grayscale, false) {
		filters = append(filters, imagorpath.Filter{Name: "grayscale", Args: ""})
	}
	if v := float64PtrVal(state.Blur); v != 0 {
		var bv float64
		if forPreview {
			bv = math.Round(v*scaleFactor*100) / 100
		} else {
			bv = v
		}
		filters = append(filters, imagorpath.Filter{Name: "blur", Args: fmtFloat(bv)})
	}
	if v := float64PtrVal(state.Sharpen); v != 0 {
		var sv float64
		if forPreview {
			sv = math.Round(v*scaleFactor*100) / 100
		} else {
			sv = v
		}
		filters = append(filters, imagorpath.Filter{Name: "sharpen", Args: fmtFloat(sv)})
	}
	if shouldApplyRoundCorner {
		if v := float64PtrVal(state.RoundCornerRadius); v > 0 {
			var cv int
			if forPreview {
				cv = int(math.Round(v * scaleFactor))
			} else {
				cv = int(v)
			}
			filters = append(filters, imagorpath.Filter{Name: "round_corner", Args: strconv.Itoa(cv)})
		}
	}
	if state.FillColor != nil && *state.FillColor != "" {
		filters = append(filters, imagorpath.Filter{Name: "fill", Args: *state.FillColor})
	}
	if shouldApplyRot && state.Rotation != nil && *state.Rotation != 0 {
		filters = append(filters, imagorpath.Filter{Name: "rotate", Args: strconv.Itoa(*state.Rotation)})
	}

	// ── layer filters ────────────────────────────────────────────────────────
	if shouldApplyLayers {
		for _, layer := range state.Layers {
			if !layer.Visible {
				continue
			}
			if skipLayerID != "" && layer.ID == skipLayerID {
				continue
			}

			if layer.Type == "text" {
				sf := scaleFactor
				if !forPreview {
					sf = 1.0
				}
				if f := buildTextFilter(layer, sf); f != nil {
					filters = append(filters, *f)
				}
				continue
			}

			// ImageLayer
			sf := 1.0
			if forPreview {
				sf = scaleFactor
			}
			layerPath := buildLayerInlinePath(layer, sf, forPreview)
			x := scalePositionValue(layer.X, sf)
			y := scalePositionValue(layer.Y, sf)
			args := fmt.Sprintf("%s,%s,%s", layerPath, x, y)
			if layer.Alpha != 0 || (layer.BlendMode != "" && layer.BlendMode != "normal") {
				args += fmt.Sprintf(",%d", layer.Alpha)
				if layer.BlendMode != "" && layer.BlendMode != "normal" {
					args += "," + layer.BlendMode
				}
			}
			filters = append(filters, imagorpath.Filter{Name: "image", Args: args})
		}
	}

	// ── proportion ───────────────────────────────────────────────────────────
	if !proportionBakedIntoPreview && state.Proportion != nil && *state.Proportion != 100 {
		filters = append(filters, imagorpath.Filter{Name: "proportion", Args: fmtFloat(*state.Proportion)})
	}

	// ── format / quality ─────────────────────────────────────────────────────
	if forPreview {
		filters = append(filters, imagorpath.Filter{Name: "preview", Args: ""})
		filters = append(filters, imagorpath.Filter{Name: "format", Args: "webp"})
	} else if state.Format != nil && *state.Format != "" {
		filters = append(filters, imagorpath.Filter{Name: "format", Args: *state.Format})
	}
	if state.Quality != nil && (forPreview || (state.Format != nil && *state.Format != "")) {
		filters = append(filters, imagorpath.Filter{Name: "quality", Args: strconv.Itoa(*state.Quality)})
	}
	if state.MaxBytes != nil && (forPreview || state.Format != nil || state.Quality != nil) {
		filters = append(filters, imagorpath.Filter{Name: "max_bytes", Args: strconv.Itoa(*state.MaxBytes)})
	}
	if state.StripIcc != nil && *state.StripIcc {
		filters = append(filters, imagorpath.Filter{Name: "strip_icc", Args: ""})
	}
	if state.StripExif != nil && *state.StripExif {
		filters = append(filters, imagorpath.Filter{Name: "strip_exif", Args: ""})
	}

	if len(filters) > 0 {
		params.Filters = filters
	}

	return params
}

// ifIntPtr returns v if p is non-nil, otherwise returns fallback.
func ifIntPtr(p *int, fallback int) int {
	if p != nil {
		return *p
	}
	return fallback
}
