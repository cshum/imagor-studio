package imagortemplate

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

var alignmentOffsetRe = regexp.MustCompile(`^(left|right|top|bottom|l|r|t|b)-(\d+)$`)
var fInsetRe = regexp.MustCompile(`^(?:f|full)-(\d+)$`)
var simpleTextRe = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

var reservedPathPrefixes = []string{
	"trim/", "meta/", "fit-in/", "stretch/",
	"top/", "left/", "right/", "bottom/", "center/", "smart/",
}

func scalePositionValue(raw json.RawMessage, scaleFactor float64) string {
	if len(raw) == 0 {
		return "0"
	}
	var n float64
	if err := json.Unmarshal(raw, &n); err == nil {
		return fmt.Sprintf("%d", int(math.Round(n*scaleFactor)))
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil || s == "" {
		return "0"
	}
	if scaleFactor == 1.0 {
		return s
	}
	if m := alignmentOffsetRe.FindStringSubmatch(s); m != nil {
		offset, _ := strconv.Atoi(m[2])
		return fmt.Sprintf("%s-%d", m[1], int(math.Round(float64(offset)*scaleFactor)))
	}
	return s
}

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

func encodeTextToBase64url(text string) string {
	if simpleTextRe.MatchString(text) {
		return text
	}
	return "b64:" + base64.RawURLEncoding.EncodeToString([]byte(text))
}

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

// ComputeOutputDims calculates output dimensions after crop → resize → padding → rotation.
func ComputeOutputDims(state Transformations, origDims Dimensions, parentDims *Dimensions) Dimensions {
	var srcW, srcH int
	if state.HasCropParams() {
		srcW = int(*state.CropWidth)
		srcH = int(*state.CropHeight)
	} else {
		srcW = origDims.Width
		srcH = origDims.Height
	}

	var outW, outH int
	if state.WidthFull && parentDims != nil {
		outW = maxInt(1, parentDims.Width-intPtrVal(state.WidthFullOffset))
	} else if state.Width != nil {
		outW = *state.Width
	} else {
		outW = srcW
	}
	if state.HeightFull && parentDims != nil {
		outH = maxInt(1, parentDims.Height-intPtrVal(state.HeightFullOffset))
	} else if state.Height != nil {
		outH = *state.Height
	} else {
		outH = srcH
	}

	var finalW, finalH int
	if boolPtrVal(state.FitIn, false) {
		scale := math.Min(math.Min(float64(outW)/float64(srcW), float64(outH)/float64(srcH)), 1.0)
		finalW = int(math.Round(float64(srcW) * scale))
		finalH = int(math.Round(float64(srcH) * scale))
	} else {
		finalW = outW
		finalH = outH
	}

	if state.FillColor != nil {
		finalW += intPtrVal(state.PaddingLeft) + intPtrVal(state.PaddingRight)
		finalH += intPtrVal(state.PaddingTop) + intPtrVal(state.PaddingBottom)
	}

	if state.Rotation != nil && (*state.Rotation == 90 || *state.Rotation == 270) {
		return Dimensions{Width: finalH, Height: finalW}
	}
	return Dimensions{Width: finalW, Height: finalH}
}

// ResolveContext walks contextPath through the layer tree and returns the active Resolution.
func ResolveContext(base Transformations, baseOrigDims Dimensions, baseImagePath string, contextPath []string) Resolution {
	if len(contextPath) == 0 {
		return Resolution{Transforms: &base, ImagePath: baseImagePath, OrigDims: baseOrigDims}
	}

	rootOutDims := ComputeOutputDims(base, baseOrigDims, nil)
	lastParentDims := rootOutDims
	currentLayers := base.Layers

	for i, layerID := range contextPath {
		var found *Layer
		for _, l := range currentLayers {
			if l.ID == layerID {
				found = l
				break
			}
		}
		if found == nil {
			return Resolution{Transforms: &base, ImagePath: baseImagePath, OrigDims: baseOrigDims}
		}

		if i == len(contextPath)-1 {
			res := Resolution{ParentDims: &lastParentDims}
			if found.Transforms != nil {
				res.Transforms = found.Transforms
			} else {
				res.Transforms = &Transformations{}
			}
			if found.ImagePath != nil {
				res.ImagePath = *found.ImagePath
			}
			if found.OriginalDimensions != nil {
				res.OrigDims = *found.OriginalDimensions
			}
			return res
		}

		layerState := Transformations{}
		if found.Transforms != nil {
			layerState = *found.Transforms
		}
		layerOrigDims := Dimensions{Width: 1, Height: 1}
		if found.OriginalDimensions != nil {
			layerOrigDims = *found.OriginalDimensions
		}
		lastParentDims = ComputeOutputDims(layerState, layerOrigDims, &lastParentDims)
		currentLayers = nil
		if found.Transforms != nil {
			currentLayers = found.Transforms.Layers
		}
	}

	return Resolution{Transforms: &base, ImagePath: baseImagePath, OrigDims: baseOrigDims}
}

func buildLayerParams(state Transformations, imagePath string, origDims Dimensions, scaleFactor float64, forPreview bool) imagorpath.Params {
	params := imagorpath.Params{}

	if state.HasCropParams() {
		params.CropLeft = *state.CropLeft
		params.CropTop = *state.CropTop
		params.CropRight = *state.CropLeft + *state.CropWidth
		params.CropBottom = *state.CropTop + *state.CropHeight
	}

	if state.Width != nil || state.Height != nil || state.WidthFull || state.HeightFull {
		hFlip := boolPtrVal(state.HFlip, false)
		vFlip := boolPtrVal(state.VFlip, false)

		if !state.WidthFull {
			w := 0
			if state.Width != nil {
				w = int(math.Round(float64(*state.Width) * scaleFactor))
			}
			if hFlip {
				w = -w
			}
			params.Width = w
		}

		if !state.HeightFull {
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
		filters = append(filters, imagorpath.Filter{Name: "blur", Args: fmtFloat(math.Round(v*scaleFactor*100) / 100)})
	}
	if v := float64PtrVal(state.Sharpen); v != 0 {
		filters = append(filters, imagorpath.Filter{Name: "sharpen", Args: fmtFloat(math.Round(v*scaleFactor*100) / 100)})
	}
	if v := float64PtrVal(state.RoundCornerRadius); v > 0 {
		filters = append(filters, imagorpath.Filter{Name: "round_corner", Args: strconv.Itoa(int(math.Round(v * scaleFactor)))})
	}
	if state.FillColor != nil && *state.FillColor != "" {
		filters = append(filters, imagorpath.Filter{Name: "fill", Args: *state.FillColor})
	}
	if state.Rotation != nil && *state.Rotation != 0 {
		filters = append(filters, imagorpath.Filter{Name: "rotate", Args: strconv.Itoa(*state.Rotation)})
	}

	for _, layer := range state.Layers {
		if !layer.Visible {
			continue
		}
		if layer.Type == "text" {
			if f := buildTextFilter(layer, scaleFactor); f != nil {
				filters = append(filters, *f)
			}
			continue
		}
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

	params.Image = imagePath
	if needsBase64Encoding(imagePath) {
		params.Base64Image = true
	}
	return params
}

func buildLayerInlinePath(layer *Layer, scaleFactor float64, forPreview bool) string {
	if layer.ImagePath == nil {
		return "/0x0/color:none"
	}
	imagePath := *layer.ImagePath
	origDims := Dimensions{Width: 1, Height: 1}
	if layer.OriginalDimensions != nil {
		origDims = *layer.OriginalDimensions
	}

	layerState := Transformations{}
	if layer.Transforms != nil {
		layerState = *layer.Transforms
		layerState.Proportion = nil
	} else {
		w := origDims.Width
		h := origDims.Height
		layerState = Transformations{Width: &w, Height: &h}
	}

	if layerState.WidthFull || layerState.HeightFull {
		return buildFTokenLayerPath(layerState, imagePath, scaleFactor, forPreview)
	}

	params := buildLayerParams(layerState, imagePath, origDims, scaleFactor, forPreview)
	raw := imagorpath.GenerateUnsafe(params)
	return "/" + strings.TrimPrefix(raw, "unsafe/")
}

func buildFTokenLayerPath(state Transformations, imagePath string, scaleFactor float64, forPreview bool) string {
	var parts []string

	if state.HasCropParams() {
		right := *state.CropLeft + *state.CropWidth
		bottom := *state.CropTop + *state.CropHeight
		parts = append(parts, fmt.Sprintf("%gx%g:%gx%g", *state.CropLeft, *state.CropTop, right, bottom))
	}

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

	paramsCopy := buildLayerParams(state, imagePath, Dimensions{Width: 1, Height: 1}, scaleFactor, forPreview)
	paramsCopy.Width = 0
	paramsCopy.Height = 0

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

func buildTextFilter(layer *Layer, scaleFactor float64) *imagorpath.Filter {
	if layer.Text == nil || strings.TrimSpace(*layer.Text) == "" {
		return nil
	}
	encodedText := encodeTextToBase64url(*layer.Text)
	x := scalePositionValue(layer.X, scaleFactor)
	y := scalePositionValue(layer.Y, scaleFactor)

	fontSize := 20.0
	if layer.FontSize != nil {
		fontSize = *layer.FontSize
	}
	scaledSize := int(math.Max(1, math.Round(fontSize*scaleFactor)))

	fontName := "sans"
	if layer.Font != nil && *layer.Font != "" {
		fontName = *layer.Font
	}
	var fontParts []string
	fontParts = append(fontParts, fontName)
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

	hasNonDefault := font != "sans-20" ||
		color != "000000" ||
		alpha != 0 ||
		blendMode != "normal" ||
		width != "0" ||
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
		optDefaults := []string{"sans-20", "000000", "0", "normal", "0", "low", "false", "word", "0"}
		for len(args) > 3 {
			optIdx := len(args) - 1 - 3
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

func fmtFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// ConvertToImagorParams converts a Transformations value to imagorpath.Params.
// isVisualCrop should be set from the ROOT transformations' VisualCropEnabled flag,
// not from the active layer's state — this ensures the suppression fires correctly
// even when operating inside a nested layer context (where the layer's own transforms
// don't carry the visualCropEnabled flag).
func ConvertToImagorParams(
	state Transformations,
	origDims Dimensions,
	parentDims *Dimensions,
	forPreview bool,
	previewMax *Dimensions,
	skipLayerID string,
	isVisualCrop bool,
) imagorpath.Params {
	params := imagorpath.Params{}

	shouldApplyCrop := !forPreview || !isVisualCrop
	shouldApplyPadding := !forPreview || !isVisualCrop
	shouldApplyLayers := !forPreview || !isVisualCrop
	shouldApplyRot := !forPreview || !isVisualCrop
	shouldApplyRoundCorner := !forPreview || !isVisualCrop

	if shouldApplyCrop && state.HasCropParams() {
		params.CropLeft = *state.CropLeft
		params.CropTop = *state.CropTop
		params.CropRight = *state.CropLeft + *state.CropWidth
		params.CropBottom = *state.CropTop + *state.CropHeight
	}

	var srcW, srcH int
	if shouldApplyCrop && state.HasCropParams() {
		srcW = int(*state.CropWidth)
		srcH = int(*state.CropHeight)
	} else {
		srcW = origDims.Width
		srcH = origDims.Height
	}

	var width, height *int

	if (state.WidthFull || state.HeightFull) && parentDims != nil {
		if state.WidthFull {
			w := maxInt(1, parentDims.Width-intPtrVal(state.WidthFullOffset))
			width = &w
		}
		if state.HeightFull {
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

	if forPreview && isVisualCrop {
		w := origDims.Width
		h := origDims.Height
		width = &w
		height = &h
	}

	outW := ifIntPtr(width, srcW)
	outH := ifIntPtr(height, srcH)

	var actualOutW, actualOutH int
	if boolPtrVal(state.FitIn, false) {
		scale := math.Min(math.Min(float64(outW)/float64(srcW), float64(outH)/float64(srcH)), 1.0)
		actualOutW = int(math.Round(float64(srcW) * scale))
		actualOutH = int(math.Round(float64(srcH) * scale))
	} else {
		actualOutW = outW
		actualOutH = outH
	}

	proportionScale := 1.0
	if state.Proportion != nil && *state.Proportion != 100 {
		proportionScale = *state.Proportion / 100.0
	}
	proportionedW := int(math.Round(float64(actualOutW) * proportionScale))
	proportionedH := int(math.Round(float64(actualOutH) * proportionScale))

	scaleFactor := 1.0
	proportionBakedIntoPreview := false

	if forPreview && previewMax != nil {
		scale := math.Min(
			float64(previewMax.Width)/float64(proportionedW),
			float64(previewMax.Height)/float64(proportionedH),
		)
		if scale < 1.0 {
			scaleFactor = scale
			w := int(math.Round(float64(proportionedW) * scale))
			h := int(math.Round(float64(proportionedH) * scale))
			width = &w
			height = &h
		} else {
			width = &proportionedW
			height = &proportionedH
		}
		if proportionScale != 1.0 {
			proportionBakedIntoPreview = true
			scaleFactor *= proportionScale
		}
	}

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

	// During visual crop preview, suppress resize mode, alignment, flip, and fill so
	// the preview shows the plain uncropped image at its natural dimensions.
	// Only colour adjustments (brightness, contrast, etc.) and blur/sharpen remain.
	shouldApplyResizeMode := !forPreview || !isVisualCrop

	if shouldApplyResizeMode {
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
		if state.HFlip != nil {
			params.HFlip = *state.HFlip
		}
		if state.VFlip != nil {
			params.VFlip = *state.VFlip
		}
	}

	if shouldApplyPadding {
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
		bv := v
		if forPreview {
			bv = math.Round(v*scaleFactor*100) / 100
		}
		filters = append(filters, imagorpath.Filter{Name: "blur", Args: fmtFloat(bv)})
	}
	if v := float64PtrVal(state.Sharpen); v != 0 {
		sv := v
		if forPreview {
			sv = math.Round(v*scaleFactor*100) / 100
		}
		filters = append(filters, imagorpath.Filter{Name: "sharpen", Args: fmtFloat(sv)})
	}
	if shouldApplyRoundCorner {
		if v := float64PtrVal(state.RoundCornerRadius); v > 0 {
			cv := int(v)
			if forPreview {
				cv = int(math.Round(v * scaleFactor))
			}
			filters = append(filters, imagorpath.Filter{Name: "round_corner", Args: strconv.Itoa(cv)})
		}
	}
	if shouldApplyResizeMode && state.FillColor != nil && *state.FillColor != "" {
		filters = append(filters, imagorpath.Filter{Name: "fill", Args: *state.FillColor})
	}
	if shouldApplyRot && state.Rotation != nil && *state.Rotation != 0 {
		filters = append(filters, imagorpath.Filter{Name: "rotate", Args: strconv.Itoa(*state.Rotation)})
	}

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

	if !proportionBakedIntoPreview && state.Proportion != nil && *state.Proportion != 100 {
		filters = append(filters, imagorpath.Filter{Name: "proportion", Args: fmtFloat(*state.Proportion)})
	}

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

func ifIntPtr(p *int, fallback int) int {
	if p != nil {
		return *p
	}
	return fallback
}

// ApplyTemplateToImage applies a template's transformations to a target image,
// mirroring the frontend's applyTemplateState logic in image-editor.ts.
// It returns a new Template with the adjusted transformations, imagePath, and
// sourceImagePath already set — callers do not need to patch these fields manually.
//
// Rules:
//   - Crop: kept only when predefinedDimensions matches targetDims (same source size);
//     stripped otherwise (coordinates would be invalid for a different image).
//   - Dimensions:
//     "predefined" → keep the template's width/height (desired output size).
//     "adaptive"   → replace width/height with targetDims (auto-size to new image).
//   - OriginalDimensions and ImagePath are always set to targetDims / imagePath so
//     downstream callers have the correct source size and path for URL generation.
func ApplyTemplateToImage(tmpl Template, imagePath string, targetDims Dimensions) Template {
	state := tmpl.Transformations

	// Crop handling: keep only if source and target dimensions match exactly.
	sourceDims := tmpl.PredefinedDims
	sameDimensions := sourceDims != nil &&
		sourceDims.Width == targetDims.Width &&
		sourceDims.Height == targetDims.Height

	if !sameDimensions {
		state.CropLeft = nil
		state.CropTop = nil
		state.CropWidth = nil
		state.CropHeight = nil
	}

	// Dimension mode handling.
	if tmpl.DimensionMode == "predefined" {
		// Keep template's explicit width/height (the desired output size).
		// state.Width / state.Height are already set from transformations.
	} else {
		// Adaptive: size to the target image's natural dimensions.
		w := targetDims.Width
		h := targetDims.Height
		state.Width = &w
		state.Height = &h
	}

	// Record the target image's original dimensions and path for downstream callers.
	state.OriginalDimensions = &targetDims
	state.ImagePath = &imagePath

	// Return a new Template with all fields preserved and transformations updated.
	result := tmpl
	result.Transformations = state
	result.SourceImagePath = imagePath
	return result
}
